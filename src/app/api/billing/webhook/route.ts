import { NextResponse, type NextRequest } from "next/server";
import { verify_stripe_signature } from "@/lib/billing/stripe_client";
import { mark_profile_pro } from "@/lib/db/supabase_client";

/**
 * The slice of a Stripe checkout.session.completed event this route consumes.
 */
interface CheckoutCompletedEvent {
  type?: string;
  data?: {
    object?: {
      client_reference_id?: string | null;
      customer?: string | null;
      payment_status?: string;
    };
  };
}

/**
 * POST /api/billing/webhook — Stripe event receiver. Verifies the signature
 * against the raw body, then flips the paying user's profile to Pro on
 * checkout.session.completed.
 *
 * Non-2xx responses make Stripe retry delivery, so the route returns 500 when
 * the Supabase write fails and 200 for events it deliberately ignores.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const endpoint_secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!endpoint_secret) {
    return NextResponse.json({ ok: false, error: "Webhook not configured." }, { status: 500 });
  }

  const raw_body = await request.text();
  const signature_header = request.headers.get("stripe-signature");
  if (!verify_stripe_signature(raw_body, signature_header, endpoint_secret)) {
    return NextResponse.json({ ok: false, error: "Invalid signature." }, { status: 400 });
  }

  let event: CheckoutCompletedEvent;
  try {
    event = JSON.parse(raw_body) as CheckoutCompletedEvent;
  } catch {
    return NextResponse.json({ ok: false, error: "Malformed payload." }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ ok: true, ignored: event.type ?? "unknown" });
  }

  const session = event.data?.object;
  const user_id = session?.client_reference_id;
  if (typeof user_id !== "string" || !user_id) {
    console.warn("[stripe] completed session without client_reference_id — ignoring.");
    return NextResponse.json({ ok: true, ignored: "missing client_reference_id" });
  }
  if (session?.payment_status && session.payment_status !== "paid") {
    return NextResponse.json({ ok: true, ignored: `payment_status ${session.payment_status}` });
  }

  const stripe_customer_id = typeof session?.customer === "string" ? session.customer : null;
  const stored = await mark_profile_pro(user_id, stripe_customer_id);
  if (!stored) {
    return NextResponse.json(
      { ok: false, error: "Could not store entitlement — retry." },
      { status: 500 },
    );
  }
  console.log(`[stripe] user ${user_id} upgraded to Pro.`);
  return NextResponse.json({ ok: true });
}
