import { NextResponse } from "next/server";
import { get_repository } from "@/lib/db/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/decisions
 *
 * Returns the most recent firewall decisions for the ops dashboard feed.
 *
 * @returns A JSON response containing the decision records.
 */
export async function GET(): Promise<NextResponse> {
  const decisions = get_repository().list_decisions();
  return NextResponse.json({ decisions }, { status: 200 });
}
