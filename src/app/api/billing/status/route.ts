import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { fetch_pro_status } from "@/lib/db/supabase_client";

const status_schema = z.object({ user_id: z.string().uuid() });

/**
 * GET /api/billing/status?user_id=... — reports whether the account has the
 * Pro entitlement. Read by the extension popup after login and after payment.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const parsed = status_schema.safeParse({
    user_id: request.nextUrl.searchParams.get("user_id"),
  });
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid user id." }, { status: 400 });
  }

  const is_pro = await fetch_pro_status(parsed.data.user_id);
  if (is_pro === null) {
    return NextResponse.json(
      { ok: false, error: "Entitlements are unavailable right now." },
      { status: 503 },
    );
  }
  return NextResponse.json({ ok: true, is_pro });
}
