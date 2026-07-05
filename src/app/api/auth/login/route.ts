import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { sign_in_with_password } from "@/lib/auth/supabase_auth";
import { session_cookie_name, session_max_age_seconds } from "@/lib/auth/session";

const login_schema = z.object({
  email: z.string().trim().email("Please enter a valid email."),
  password: z.string().min(1, "Please enter your password."),
});

/**
 * POST /api/auth/login — verifies credentials against Supabase and starts a
 * session via an httpOnly cookie.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.json().catch(() => null);
  const parsed = login_schema.safeParse(body);
  if (!parsed.success) {
    const first_issue = parsed.error.issues[0]?.message ?? "Invalid login details.";
    return NextResponse.json({ ok: false, error: first_issue }, { status: 400 });
  }

  const outcome = await sign_in_with_password(parsed.data.email, parsed.data.password);
  if (!outcome.ok) {
    return NextResponse.json({ ok: false, error: outcome.error }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(
    session_cookie_name,
    JSON.stringify({ email: outcome.email, full_name: outcome.full_name }),
    { httpOnly: true, sameSite: "lax", path: "/", maxAge: session_max_age_seconds },
  );
  return response;
}
