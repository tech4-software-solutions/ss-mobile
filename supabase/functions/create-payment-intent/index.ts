import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17";

const MAX_CART_ITEMS = 20;
const MAX_QTY = 10;
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 10;

function cors(origin: string | null) {
  const allowed = (Deno.env.get("ALLOWED_ORIGINS") ?? "").split(",").map((o) => o.trim()).filter(Boolean);
  const ok = origin && (allowed.includes(origin) || origin.includes("localhost"));
  return {
    "Access-Control-Allow-Origin": ok ? origin! : allowed[0] ?? "null",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

function clean(value: string, max = 120) {
  return value.replace(/[<>"'`;]/g, "").trim().slice(0, max);
}

function validPhone(phone: string) {
  return /^(\+94|0)?7\d{8}$/.test(phone.replace(/[\s-]/g, ""));
}

async function rateLimit(supabase: ReturnType<typeof createClient>, fp: string) {
  const { data: row } = await supabase
    .from("checkout_rate_limits")
    .select("request_count, window_start")
    .eq("fingerprint", fp)
    .maybeSingle();

  const now = Date.now();
  if (!row) {
    await supabase.from("checkout_rate_limits").upsert({ fingerprint: fp, request_count: 1, window_start: new Date().toISOString() });
    return true;
  }
  if (now - new Date(row.window_start).getTime() > RATE_WINDOW_MS) {
    await supabase.from("checkout_rate_limits").update({ request_count: 1, window_start: new Date().toISOString() }).eq("fingerprint", fp);
    return true;
  }
  if (row.request_count >= RATE_MAX) return false;
  await supabase.from("checkout_rate_limits").update({ request_count: row.request_count + 1 }).eq("fingerprint", fp);
  return true;
}

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const headers = cors(origin);

  if (req.method === "OPTIONS") return new Response("ok", { headers });

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...headers, "Content-Type": "application/json" } });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!stripeKey || !supabaseUrl || !serviceKey) {
      return new Response(JSON.stringify({ error: "Server configuration incomplete" }), { status: 500, headers: { ...headers, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const { items, customer_name, customer_phone, customer_email, delivery_method, address, promo_code } = body;

    if (!Array.isArray(items) || items.length === 0 || items.length > MAX_CART_ITEMS) {
      return new Response(JSON.stringify({ error: "Invalid cart" }), { status: 400, headers: { ...headers, "Content-Type": "application/json" } });
    }

    const name = clean(customer_name ?? "", 80);
    const phone = clean(customer_phone ?? "", 20);
    const email = customer_email ? clean(customer_email, 254) : null;

    if (name.length < 2 || !validPhone(phone)) {
      return new Response(JSON.stringify({ error: "Invalid customer details" }), { status: 400, headers: { ...headers, "Content-Type": "application/json" } });
    }

    if (delivery_method === "delivery" && clean(address ?? "", 300).length < 10) {
      return new Response(JSON.stringify({ error: "Delivery address required" }), { status: 400, headers: { ...headers, "Content-Type": "application/json" } });
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const fingerprint = `${clientIp}:${phone}`;

    if (!(await rateLimit(supabase, fingerprint))) {
      return new Response(JSON.stringify({ error: "Too many requests. Please wait a minute." }), { status: 429, headers: { ...headers, "Content-Type": "application/json" } });
    }

    const productIds = [...new Set(items.map((i: { product_id: string }) => i.product_id))];
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id, name, price, in_stock")
      .in("id", productIds);

    if (productsError || !products?.length) {
      return new Response(JSON.stringify({ error: "Could not verify products" }), { status: 400, headers: { ...headers, "Content-Type": "application/json" } });
    }

    const priceMap = new Map(products.map((p) => [p.id, p]));
    let serverSubtotal = 0;
    const orderItems: { product_id: string; product_name: string; quantity: number; unit_price: number }[] = [];

    for (const item of items) {
      const product = priceMap.get(item.product_id);
      const qty = Number(item.quantity);
      if (!product || !product.in_stock || qty < 1 || qty > MAX_QTY) {
        return new Response(JSON.stringify({ error: "Invalid cart item" }), { status: 400, headers: { ...headers, "Content-Type": "application/json" } });
      }
      serverSubtotal += Number(product.price) * qty;
      orderItems.push({ product_id: product.id, product_name: product.name, quantity: qty, unit_price: Number(product.price) });
    }

    const deliveryFee = delivery_method === "delivery" ? 350 : 0;
    let discountAmount = 0;

    if (promo_code && typeof promo_code === "string") {
      const { data: promoData } = await supabase.rpc("validate_promo_code", { p_code: promo_code, p_subtotal: serverSubtotal });
      const promo = Array.isArray(promoData) ? promoData[0] : promoData;
      if (promo?.valid) discountAmount = Number(promo.discount);
    }

    const total = Math.max(0, serverSubtotal + deliveryFee - discountAmount);
    if (total < 100) {
      return new Response(JSON.stringify({ error: "Order total too low" }), { status: 400, headers: { ...headers, "Content-Type": "application/json" } });
    }

    const { data: order, error: orderError } = await supabase.from("orders").insert({
      customer_name: name,
      customer_phone: phone,
      customer_email: email,
      delivery_method,
      address: delivery_method === "delivery" ? clean(address ?? "", 300) : null,
      subtotal: serverSubtotal,
      delivery_fee: deliveryFee,
      discount_amount: discountAmount,
      total,
      promo_code: promo_code || null,
      status: "pending",
    }).select("id").single();

    if (orderError || !order) {
      return new Response(JSON.stringify({ error: "Could not create order" }), { status: 500, headers: { ...headers, "Content-Type": "application/json" } });
    }

    await supabase.from("order_items").insert(orderItems.map((oi) => ({ ...oi, order_id: order.id })));

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-11-20.acacia" });
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(total * 100),
      currency: "lkr",
      metadata: { order_id: order.id, customer_phone: phone },
      automatic_payment_methods: { enabled: true },
    });

    await supabase.from("orders").update({ stripe_payment_intent_id: paymentIntent.id }).eq("id", order.id);
    await supabase.from("payment_audit_log").insert({
      event_type: "payment_intent_created",
      order_id: order.id,
      fingerprint,
      metadata: { total, item_count: items.length },
    });

    return new Response(JSON.stringify({ client_secret: paymentIntent.client_secret, order_id: order.id }), {
      headers: { ...headers, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Payment failed";
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { ...headers, "Content-Type": "application/json" } });
  }
});
