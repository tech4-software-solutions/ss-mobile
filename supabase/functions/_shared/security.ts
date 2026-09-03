const MAX_CART_ITEMS = 20;
const MAX_QTY_PER_ITEM = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;

export function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowed = Deno.env.get("ALLOWED_ORIGINS")?.split(",").map((o) => o.trim()) ?? [];
  const isDev = Deno.env.get("ENVIRONMENT") === "development";
  const allowOrigin =
    origin && (allowed.includes(origin) || (isDev && origin.includes("localhost")))
      ? origin
      : allowed[0] ?? "";

  return {
    "Access-Control-Allow-Origin": allowOrigin || "null",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

export function sanitizeText(value: string, maxLen = 120): string {
  return value.replace(/[<>"'`;]/g, "").trim().slice(0, maxLen);
}

export function validatePhone(phone: string): boolean {
  const normalized = phone.replace(/[\s-]/g, "");
  return /^(\+94|0)?7\d{8}$/.test(normalized);
}

export async function checkRateLimit(
  supabase: { from: (t: string) => unknown },
  fingerprint: string,
): Promise<boolean> {
  const client = supabase as {
    from: (t: string) => {
      select: (c: string) => { eq: (k: string, v: string) => { maybeSingle: () => Promise<{ data: { request_count: number; window_start: string } | null }> } };
      upsert: (d: object) => Promise<unknown>;
      update: (d: object) => { eq: (k: string, v: string) => Promise<unknown> };
      delete: () => { eq: (k: string, v: string) => Promise<unknown> };
    };
  };

  const now = Date.now();
  const { data: row } = await client
    .from("checkout_rate_limits")
    .select("request_count, window_start")
    .eq("fingerprint", fingerprint)
    .maybeSingle();

  if (!row) {
    await client.from("checkout_rate_limits").upsert({
      fingerprint,
      request_count: 1,
      window_start: new Date().toISOString(),
    });
    return true;
  }

  const windowStart = new Date(row.window_start).getTime();
  if (now - windowStart > RATE_LIMIT_WINDOW_MS) {
    await client.from("checkout_rate_limits").update({
      request_count: 1,
      window_start: new Date().toISOString(),
    }).eq("fingerprint", fingerprint);
    return true;
  }

  if (row.request_count >= RATE_LIMIT_MAX) return false;

  await client.from("checkout_rate_limits").update({
    request_count: row.request_count + 1,
  }).eq("fingerprint", fingerprint);

  return true;
}

export { MAX_CART_ITEMS, MAX_QTY_PER_ITEM };
