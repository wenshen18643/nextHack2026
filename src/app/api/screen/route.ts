import { NextResponse } from "next/server";
import { z } from "zod";
import { screen_transfer } from "@/lib/screen/service";

export const runtime = "nodejs";
export const maxDuration = 60;

const screen_request_schema = z.object({
  payee: z.string().min(1),
  amount: z.number().positive().finite(),
  memo: z.string().optional(),
});

/**
 * Permissive CORS so the extension can call this from any bank-site origin.
 * The endpoint only returns advice and never moves money, so a wide origin is
 * acceptable; tighten `access-control-allow-origin` to a known extension id in
 * production if the surface ever handles anything sensitive.
 */
const cors_headers = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type",
} as const;

/**
 * CORS preflight handler for the browser extension.
 */
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, { status: 204, headers: cors_headers });
}

/**
 * POST /api/screen
 *
 * Screens a single transfer observed by the browser extension on a bank page
 * and returns warn/allow/block advice. Has no access to user history, so it
 * relies on history-free scam heuristics plus the AI adjudicator. Validation
 * failures map to 400; any other failure to 500 without leaking internals.
 *
 * @param request The incoming request carrying { payee, amount, memo? }.
 * @returns The screening advice as JSON, with CORS headers.
 */
export async function POST(request: Request): Promise<NextResponse> {
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
    const result = await screen_transfer(parsed.data);
    return NextResponse.json(result, { status: 200, headers: cors_headers });
  } catch {
    return NextResponse.json(
      { error: "Failed to screen transfer." },
      { status: 500, headers: cors_headers },
    );
  }
}
