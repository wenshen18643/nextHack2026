import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { create_pro_checkout_session } from "@/lib/billing/stripe_client";
import { fetch_profile_record } from "@/lib/db/supabase_client";

const checkout_schema = z.object({
  user_id: z.string().uuid("Sign in again — the account id is invalid."),
  email: z.string().trim().email("Sign in again — the account email is invalid."),
});

/**
 * POST /api/billing/checkout — starts a Stripe Checkout Session for the Pro
 * upgrade and returns its hosted URL for the extension to open in a new tab.
 *
 * The user id must belong to an existing profile; this stops arbitrary ids
 * from being smuggled into client_reference_id and marked Pro later.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.json().catch(() => null);
  const parsed = checkout_schema.safeParse(body);
  if (!parsed.success) {
    const first_issue = parsed.error.issues[0]?.message ?? "Invalid checkout request.";
    return NextResponse.json({ ok: false, error: first_issue }, { status: 400 });
  }

  const profile = await fetch_profile_record(parsed.data.user_id);
  if (!profile) {
    return NextResponse.json(
      { ok: false, error: "No account found for this user — sign in again." },
      { status: 404 },
    );
  }

  const outcome = await create_pro_checkout_session({
    user_id: parsed.data.user_id,
    email: parsed.data.email,
    site_origin: request.nextUrl.origin,
  });
  if (!outcome.ok) {
    return NextResponse.json({ ok: false, error: outcome.error }, { status: 502 });
  }
  return NextResponse.json({ ok: true, url: outcome.url });
}
