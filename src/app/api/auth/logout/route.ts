import { NextResponse, type NextRequest } from "next/server";
import { session_cookie_name } from "@/lib/auth/session";

/**
 * GET /api/auth/logout — clears the session cookie and returns to the landing
 * page. A plain link in the header is enough to sign out.
 */
export function GET(request: NextRequest): NextResponse {
  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.delete(session_cookie_name);
  return response;
}
