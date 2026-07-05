import { resolve_supabase_config } from "@/lib/db/supabase_client";

const auth_request_timeout_ms = 8000;

/**
 * Outcome of an auth call: either the authenticated identity or a user-safe
 * error message the login form can render directly.
 */
export type AuthOutcome =
  | { ok: true; user_id: string; email: string; full_name: string }
  | { ok: false; error: string };

const service_unconfigured_error =
  "Accounts are not available yet — the server is missing its Supabase configuration.";

/**
 * Performs one JSON request against the Supabase GoTrue API using the
 * server-only service-role key, with a hard timeout.
 *
 * @param path The GoTrue path, e.g. /auth/v1/admin/users.
 * @param body The JSON request body.
 * @returns The response status and parsed body, or null on transport failure.
 */
async function call_gotrue(
  path: string,
  body: Record<string, unknown>,
): Promise<{ status: number; json: Record<string, unknown> } | null> {
  const config = resolve_supabase_config();
  if (!config) {
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), auth_request_timeout_ms);

  try {
    const response = await fetch(`${config.url}${path}`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        apikey: config.key,
        authorization: `Bearer ${config.key}`,
      },
      body: JSON.stringify(body),
    });
    const json = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    return { status: response.status, json };
  } catch (error) {
    console.error(`[auth] gotrue ${path} failed:`, error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Extracts the display name from a GoTrue user object's metadata.
 */
function read_full_name(user: Record<string, unknown>, fallback: string): string {
  const metadata = user.user_metadata as Record<string, unknown> | undefined;
  return typeof metadata?.full_name === "string" ? metadata.full_name : fallback;
}

/**
 * Creates a new, already-confirmed Supabase auth user via the admin endpoint.
 *
 * The admin route is used so signup works without an email round-trip; the
 * service-role key never leaves the server.
 *
 * @param details The email, password, display name, and birth year to store.
 * @returns The created identity, or a user-safe error.
 */
export async function create_confirmed_user(details: {
  email: string;
  password: string;
  full_name: string;
  birth_year: number;
}): Promise<AuthOutcome> {
  const result = await call_gotrue("/auth/v1/admin/users", {
    email: details.email,
    password: details.password,
    email_confirm: true,
    user_metadata: { full_name: details.full_name, birth_year: details.birth_year },
  });

  if (!result) {
    return { ok: false, error: service_unconfigured_error };
  }
  if (result.status === 422 || result.status === 409) {
    return { ok: false, error: "That email is already registered — sign in instead." };
  }
  const user_id = result.json.id;
  if (result.status >= 300 || typeof user_id !== "string") {
    console.warn(`[auth] signup HTTP ${result.status}:`, result.json);
    return { ok: false, error: "Could not create the account. Please try again." };
  }
  return {
    ok: true,
    user_id,
    email: details.email,
    full_name: details.full_name,
  };
}

/**
 * Verifies an email/password pair against Supabase via the password grant.
 *
 * @param email    The account email.
 * @param password The account password.
 * @returns The authenticated identity, or a user-safe error.
 */
export async function sign_in_with_password(
  email: string,
  password: string,
): Promise<AuthOutcome> {
  const result = await call_gotrue("/auth/v1/token?grant_type=password", { email, password });

  if (!result) {
    return { ok: false, error: service_unconfigured_error };
  }
  const user = result.json.user as Record<string, unknown> | undefined;
  if (result.status >= 300 || !user || typeof user.id !== "string") {
    return { ok: false, error: "Wrong email or password." };
  }
  return {
    ok: true,
    user_id: user.id,
    email,
    full_name: read_full_name(user, email),
  };
}
