import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { create_confirmed_user, type AuthOutcome } from "@/lib/auth/supabase_auth";
import { session_cookie_name, session_max_age_seconds } from "@/lib/auth/session";
import { insert_profile_record } from "@/lib/db/supabase_client";

const minimum_signup_age_years = 13;
const earliest_supported_birth_year = 1900;

const signup_schema = z.object({
  full_name: z.string().trim().min(2, "Please enter your name."),
  email: z.string().trim().email("Please enter a valid email."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  birth_year: z
    .number()
    .int()
    .min(earliest_supported_birth_year, "Please enter a valid birth year.")
    .max(new Date().getFullYear() - minimum_signup_age_years, "You must be at least 13."),
});

/**
 * Builds the success response carrying the httpOnly session cookie.
 */
function respond_with_session(outcome: Extract<AuthOutcome, { ok: true }>): NextResponse {
  const response = NextResponse.json({
    ok: true,
    user: {
      user_id: outcome.user_id,
      email: outcome.email,
      full_name: outcome.full_name,
    },
  });
  response.cookies.set(
    session_cookie_name,
    JSON.stringify({
      email: outcome.email,
      full_name: outcome.full_name,
      user_id: outcome.user_id,
    }),
    { httpOnly: true, sameSite: "lax", path: "/", maxAge: session_max_age_seconds },
  );
  return response;
}

/**
 * POST /api/auth/signup — creates a confirmed account, stores the age profile
 * used by age-aware screening, and signs the new user in via a session cookie.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.json().catch(() => null);
  const parsed = signup_schema.safeParse(body);
  if (!parsed.success) {
    const first_issue = parsed.error.issues[0]?.message ?? "Invalid signup details.";
    return NextResponse.json({ ok: false, error: first_issue }, { status: 400 });
  }

  const outcome = await create_confirmed_user(parsed.data);
  if (!outcome.ok) {
    return NextResponse.json({ ok: false, error: outcome.error }, { status: 400 });
  }

  const profile_stored = await insert_profile_record({
    id: outcome.user_id,
    full_name: parsed.data.full_name,
    birth_year: parsed.data.birth_year,
  });
  if (!profile_stored) {
    console.warn("[auth] account created but profile insert failed — check profiles table.");
  }

  return respond_with_session(outcome);
}
