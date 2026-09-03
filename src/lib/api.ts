import type { CartItem, CheckoutDetails, PromoValidation } from "../types";
import { getSupabase, isSupabaseConfigured } from "./supabase";
import { isStripeConfigured } from "./stripe";
import { sanitizeText } from "./validation";

export async function validatePromoCode(
  code: string,
  subtotal: number,
): Promise<PromoValidation> {
  const supabase = getSupabase();
  if (!supabase) {
    return { valid: false, message: "Promo validation unavailable" };
  }

  const safeCode = sanitizeText(code, 32);
  if (!safeCode) {
    return { valid: false, message: "Invalid promo code" };
  }

  const { data, error } = await supabase.rpc("validate_promo_code", {
    p_code: safeCode.toUpperCase(),
    p_subtotal: subtotal,
  });

  if (error) {
    return { valid: false, message: "Could not validate promo code" };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.valid) {
    return { valid: false, message: row?.message || "Invalid or expired promo code" };
  }

  return {
    valid: true,
    code: row.code,
    discount: row.discount,
    type: row.discount_type,
  };
}

export async function createPaymentIntent(
  items: CartItem[],
  details: CheckoutDetails,
): Promise<{ clientSecret: string; orderId: string } | { error: string }> {
  if (!isSupabaseConfigured || !isStripeConfigured) {
    return { error: "Secure checkout requires Supabase and Stripe configuration" };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return { error: "Payment service unavailable" };
  }

  const subtotal = items.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const deliveryFee = details.deliveryMethod === "delivery" ? 350 : 0;
  let discountAmount = 0;

  if (details.promoCode) {
    const promo = await validatePromoCode(details.promoCode, subtotal);
    if (promo.valid && promo.discount) {
      discountAmount = promo.discount;
    }
  }

  const { data, error } = await supabase.functions.invoke("create-payment-intent", {
    body: {
      items: items.map((i) => ({
        product_id: i.product.id,
        quantity: i.quantity,
      })),
      customer_name: sanitizeText(details.customerName, 80),
      customer_phone: sanitizeText(details.customerPhone, 20),
      customer_email: details.customerEmail ? sanitizeText(details.customerEmail, 254) : null,
      delivery_method: details.deliveryMethod,
      address: details.address ? sanitizeText(details.address, 300) : null,
      promo_code: details.promoCode || null,
    },
  });

  if (error) {
    return { error: error.message || "Payment setup failed" };
  }
  if (data?.error) {
    return { error: data.error };
  }

  return {
    clientSecret: data.client_secret,
    orderId: data.order_id,
  };
}

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

export async function uploadBrandImage(file: File): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  if (!ALLOWED_IMAGE_TYPES.includes(file.type) || file.size > MAX_IMAGE_BYTES) {
    return null;
  }

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `brands/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from("brand-images").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });

  if (error) return null;

  const { data } = supabase.storage.from("brand-images").getPublicUrl(path);
  return data.publicUrl;
}
