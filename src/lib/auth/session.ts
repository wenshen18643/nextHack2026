import { cookies } from "next/headers";

export const session_cookie_name = "sentinel_session";
export const session_max_age_seconds = 60 * 60 * 24 * 7;

/**
 * The signed-in identity stored in the session cookie: display data plus the
 * Supabase user id used to look up the sender's profile during screening.
 * Anything security-sensitive stays server-side in Supabase.
 */
export interface SessionUser {
  email: string;
  full_name: string;
  user_id?: string;
}

/**
 * Reads the current session user from the request cookies.
 *
 * @returns The session user, or null when signed out or the cookie is invalid.
 */
export function read_session_user(): SessionUser | null {
  const raw_value = cookies().get(session_cookie_name)?.value;
  if (!raw_value) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw_value) as Partial<SessionUser>;
    if (typeof parsed.email === "string" && typeof parsed.full_name === "string") {
      return {
        email: parsed.email,
        full_name: parsed.full_name,
        user_id: typeof parsed.user_id === "string" ? parsed.user_id : undefined,
      };
    }
    return null;
  } catch {
    return null;
  }
}
