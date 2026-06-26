import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { evaluate_and_record, UnknownUserError } from "@/lib/risk/service";

export const runtime = "nodejs";

/**
 * POST /api/transfer
 *
 * Evaluates a transfer through the behavioral risk firewall and returns the
 * firewall assessment. Validation and unknown-user failures map to 400/404;
 * any other failure is surfaced as 500 without leaking internals.
 *
 * @param request The incoming request carrying a JSON transfer payload.
 * @returns A JSON response with the assessment or a structured error.
 */
export async function POST(request: Request): Promise<NextResponse> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const force_ai = new URL(request.url).searchParams.get("force_ai") === "1";

  try {
    const assessment = await evaluate_and_record(payload, { force_ai });
    return NextResponse.json(assessment, { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid transfer payload.", issues: error.issues },
        { status: 400 },
      );
    }
    if (error instanceof UnknownUserError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to evaluate transfer." }, { status: 500 });
  }
}
