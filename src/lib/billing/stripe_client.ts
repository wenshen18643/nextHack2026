import { createHmac, timingSafeEqual } from "node:crypto";

const stripe_api_base = "https://api.stripe.com/v1";
const stripe_request_timeout_ms = 10000;
const webhook_tolerance_seconds = 300;
const pro_price_amount_cents = 990;
const pro_price_currency = "myr";
const pro_product_name = "Sentinel Scam Shield Pro";

/**
 * Reads the server-only Stripe secret key from the environment.
 *
 * @returns The key, or null when billing is unconfigured so callers can
 *          degrade to a clear "billing unavailable" response.
 */
export function resolve_stripe_secret_key(): string | null {
  return process.env.STRIPE_SECRET_KEY || null;
}

/**
 * Result of creating a hosted Checkout Session: the URL to send the payer to.
 */
export type CheckoutOutcome =
  | { ok: true; url: string }
  | { ok: false; error: string };

/**
 * Creates a Stripe Checkout Session for the one-time Pro upgrade using inline
 * price data, so no product needs to exist in the Stripe dashboard.
 *
 * The Supabase user id travels as client_reference_id and comes back on the
 * webhook, which is how the payment is tied to the right profile row.
 *
 * @param details The paying user's Supabase id and email, plus the site origin
 *                used to build the success/cancel redirect URLs.
 * @returns The hosted Checkout URL, or a user-safe error.
 */
export async function create_pro_checkout_session(details: {
  user_id: string;
  email: string;
  site_origin: string;
}): Promise<CheckoutOutcome> {
  const secret_key = resolve_stripe_secret_key();
  if (!secret_key) {
    return { ok: false, error: "Billing is not configured on the server yet." };
  }

  const form = new URLSearchParams({
    mode: "payment",
    client_reference_id: details.user_id,
    customer_email: details.email,
    success_url: `${details.site_origin}/billing/result?state=success`,
    cancel_url: `${details.site_origin}/billing/result?state=cancelled`,
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": pro_price_currency,
    "line_items[0][price_data][unit_amount]": String(pro_price_amount_cents),
    "line_items[0][price_data][product_data][name]": pro_product_name,
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), stripe_request_timeout_ms);

  try {
    const response = await fetch(`${stripe_api_base}/checkout/sessions`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        authorization: `Bearer ${secret_key}`,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });
    const json = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok || typeof json.url !== "string") {
      console.warn(`[stripe] checkout session HTTP ${response.status}:`, json);
      return { ok: false, error: "Could not start the payment. Please try again." };
    }
    return { ok: true, url: json.url };
  } catch (error) {
    console.error("[stripe] checkout session failed:", error);
    return { ok: false, error: "Could not reach the payment provider." };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Verifies a Stripe webhook signature header against the raw request body.
 *
 * Implements Stripe's documented scheme: the header carries `t=<timestamp>`
 * and one or more `v1=<hmac>` entries; the expected HMAC-SHA256 is computed
 * over `<timestamp>.<raw_body>` with the endpoint secret. Comparison is
 * constant-time and stale timestamps are rejected to block replay attacks.
 *
 * @param raw_body         The exact request body bytes as received.
 * @param signature_header The Stripe-Signature header value.
 * @param endpoint_secret  The webhook endpoint secret (whsec_...).
 * @returns True only when a v1 signature matches and the timestamp is fresh.
 */
export function verify_stripe_signature(
  raw_body: string,
  signature_header: string | null,
  endpoint_secret: string,
): boolean {
  if (!signature_header) {
    return false;
  }

  const parts = new Map<string, string[]>();
  for (const pair of signature_header.split(",")) {
    const [key, value] = pair.split("=", 2).map((piece) => piece?.trim() ?? "");
    if (!key || !value) {
      continue;
    }
    const existing = parts.get(key) ?? [];
    existing.push(value);
    parts.set(key, existing);
  }

  const timestamp = Number(parts.get("t")?.[0]);
  const candidate_signatures = parts.get("v1") ?? [];
  if (!Number.isFinite(timestamp) || candidate_signatures.length === 0) {
    return false;
  }
  const age_seconds = Math.abs(Date.now() / 1000 - timestamp);
  if (age_seconds > webhook_tolerance_seconds) {
    return false;
  }

  const expected = createHmac("sha256", endpoint_secret)
    .update(`${timestamp}.${raw_body}`)
    .digest("hex");
  const expected_buffer = Buffer.from(expected, "utf8");
  return candidate_signatures.some((candidate) => {
    const candidate_buffer = Buffer.from(candidate, "utf8");
    return (
      candidate_buffer.length === expected_buffer.length &&
      timingSafeEqual(candidate_buffer, expected_buffer)
    );
  });
}

/**
 * Builds a valid Stripe-Signature header for a payload. Exported for tests so
 * the verifier can be exercised without hitting Stripe.
 *
 * @param raw_body        The payload to sign.
 * @param endpoint_secret The webhook endpoint secret.
 * @param timestamp       Unix seconds to embed; defaults to now.
 * @returns A header string in Stripe's `t=...,v1=...` format.
 */
export function build_stripe_signature_header(
  raw_body: string,
  endpoint_secret: string,
  timestamp: number = Math.floor(Date.now() / 1000),
): string {
  const signature = createHmac("sha256", endpoint_secret)
    .update(`${timestamp}.${raw_body}`)
    .digest("hex");
  return `t=${timestamp},v1=${signature}`;
}
