import { NextResponse } from "next/server";
import { z } from "zod";
import { screen_transfer, type SenderContext } from "@/lib/screen/service";
import { read_session_user } from "@/lib/auth/session";
import { fetch_profile_record } from "@/lib/db/supabase_client";

export const runtime = "nodejs";
export const maxDuration = 60;

const screen_request_schema = z.object({
  payee: z.string().min(1),
  amount: z.number().positive().finite(),
  memo: z.string().optional(),
});

/**
 * CORS headers for the extension. The origin is echoed (rather than `*`)
 * because the extension sends the session cookie with `credentials: "include"`,
 * and browsers reject credentialed responses that allow any origin. The
 * endpoint only returns advice and never moves money, so echoing is acceptable;
 * pin it to the extension id in production.
 */
function build_cors_headers(request: Request): Record<string, string> {
  return {
    "access-control-allow-origin": request.headers.get("origin") ?? "*",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-allow-credentials": "true",
    vary: "origin",
  };
}

/**
 * Resolves the signed-in sender from the session cookie and stored profile.
 * Fail-safe: an anonymous request, missing profile, or lookup failure resolves
 * to undefined and screening proceeds without sender enrichment.
 */
async function resolve_sender_context(): Promise<SenderContext | undefined> {
  const session_user = read_session_user();
  if (!session_user) {
    return undefined;
  }
  const profile = session_user.user_id
    ? await fetch_profile_record(session_user.user_id)
    : null;
  return {
    name: profile?.full_name ?? session_user.full_name,
    age: profile ? new Date().getFullYear() - profile.birth_year : undefined,
  };
}

/**
 * CORS preflight handler for the browser extension.
 */
export async function OPTIONS(request: Request): Promise<NextResponse> {
  return new NextResponse(null, { status: 204, headers: build_cors_headers(request) });
}

/**
 * POST /api/screen
 *
 * Screens a single transfer observed by the browser extension on a bank page
 * and returns warn/allow/block advice. When the request carries a Sentinel
 * session cookie, the sender's profile (name, age) enriches the screening
 * context; anonymous requests are screened identically without it. Validation
 * failures map to 400; any other failure to 500 without leaking internals.
 *
 * @param request The incoming request carrying { payee, amount, memo? }.
 * @returns The screening advice as JSON, with CORS headers.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const cors_headers = build_cors_headers(request);

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400, headers: cors_headers },
    );
  }

  const parsed = screen_request_schema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid screen payload.", issues: parsed.error.issues },
      { status: 400, headers: cors_headers },
    );
  }

  try {
    const sender = await resolve_sender_context();
    const result = await screen_transfer(parsed.data, sender);
    return NextResponse.json(result, { status: 200, headers: cors_headers });
  } catch {
    return NextResponse.json(
      { error: "Failed to screen transfer." },
      { status: 500, headers: cors_headers },
    );
  }
}
