const request_timeout_ms = 8000;

/**
 * Resolved Supabase connection details for server-side, service-role access.
 *
 * @property url The Supabase project REST base, e.g. https://xxxx.supabase.co.
 * @property key The service-role key, used only on the server. It bypasses RLS,
 *               so it must never reach the browser or the extension.
 */
export interface SupabaseConfig {
  url: string;
  key: string;
}

/**
 * Reads the Supabase configuration from the environment.
 *
 * Accepts either `SUPABASE_URL` or the Next public URL so a single project value
 * works on server and client builds. Returns null when unconfigured so every
 * caller can degrade gracefully instead of throwing.
 *
 * @returns The configuration, or null when either value is missing.
 */
export function resolve_supabase_config(): SupabaseConfig | null {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return null;
  }
  return { url, key };
}

/**
 * Builds the auth headers PostgREST requires for service-role requests.
 */
function build_auth_headers(key: string): Record<string, string> {
  return {
    "content-type": "application/json",
    apikey: key,
    authorization: `Bearer ${key}`,
  };
}

/**
 * Calls a Postgres function exposed through PostgREST's `/rpc` surface.
 *
 * Fail-safe: a missing configuration, timeout, transport error, or non-2xx
 * response resolves to null so the calling agent simply contributes no signals
 * rather than failing the whole screen. PostgREST returns set-returning
 * functions as an array, so callers read the first row.
 *
 * @param function_name The Postgres function to invoke.
 * @param args          Named arguments matching the function signature.
 * @returns The parsed JSON result, or null when the call could not complete.
 */
export async function call_supabase_rpc<TResult>(
  function_name: string,
  args: Record<string, unknown>,
): Promise<TResult | null> {
  const config = resolve_supabase_config();
  if (!config) {
    console.warn("[supabase] no SUPABASE_SERVICE_ROLE_KEY/URL set — skipping DB-backed agents.");
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), request_timeout_ms);

  try {
    const response = await fetch(`${config.url}/rest/v1/rpc/${function_name}`, {
      method: "POST",
      signal: controller.signal,
      headers: build_auth_headers(config.key),
      body: JSON.stringify(args),
    });

    if (!response.ok) {
      console.warn(`[supabase] rpc ${function_name} HTTP ${response.status} — skipping.`);
      return null;
    }

    console.log(`[supabase] rpc ${function_name} ok`);
    return (await response.json()) as TResult;
  } catch (error) {
    console.error(`[supabase] rpc ${function_name} failed — skipping:`, error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Persists one screened transfer so the behaviour and anomaly agents can learn
 * from it on subsequent calls.
 *
 * Best-effort: any failure is swallowed because logging must never block or
 * change the verdict the user already received.
 *
 * @param row The transfer record to append to the `transfers` table.
 */
/**
 * Upserts one captured page snapshot into the `dom_dumps` table, keyed on
 * (site, frame_slug) so each site/frame keeps only its latest dump.
 *
 * @param row The dump to store: site name, frame slug, source host, and HTML.
 * @returns True when the upsert succeeded, false otherwise.
 */
export async function upsert_dom_dump(row: {
  site: string;
  frame_slug: string;
  host: string;
  html: string;
}): Promise<boolean> {
  const config = resolve_supabase_config();
  if (!config) {
    return false;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), request_timeout_ms);

  try {
    const response = await fetch(
      `${config.url}/rest/v1/dom_dumps?on_conflict=site,frame_slug`,
      {
        method: "POST",
        signal: controller.signal,
        headers: {
          ...build_auth_headers(config.key),
          prefer: "resolution=merge-duplicates,return=minimal",
        },
        body: JSON.stringify({ ...row, captured_at: new Date().toISOString() }),
      },
    );
    if (!response.ok) {
      console.warn(`[supabase] dom dump upsert HTTP ${response.status}.`);
    }
    return response.ok;
  } catch (error) {
    console.error("[supabase] dom dump upsert failed:", error);
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Persists one signed-up user's profile so age-aware screening signals can read
 * it later. Unlike transfer logging this is NOT best-effort: signup must fail
 * loudly when the profile cannot be stored, so the caller receives the result.
 *
 * @param row The profile to insert: auth user id, full name, and birth year.
 * @returns True when the insert succeeded, false otherwise.
 */
export async function insert_profile_record(row: {
  id: string;
  full_name: string;
  birth_year: number;
}): Promise<boolean> {
  const config = resolve_supabase_config();
  if (!config) {
    return false;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), request_timeout_ms);

  try {
    const response = await fetch(`${config.url}/rest/v1/profiles`, {
      method: "POST",
      signal: controller.signal,
      headers: { ...build_auth_headers(config.key), prefer: "return=minimal" },
      body: JSON.stringify(row),
    });
    if (!response.ok) {
      console.warn(`[supabase] profile insert HTTP ${response.status}.`);
    }
    return response.ok;
  } catch (error) {
    console.error("[supabase] profile insert failed:", error);
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export async function insert_transfer_record(row: Record<string, unknown>): Promise<void> {
  const config = resolve_supabase_config();
  if (!config) {
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), request_timeout_ms);

  try {
    const response = await fetch(`${config.url}/rest/v1/transfers`, {
      method: "POST",
      signal: controller.signal,
      headers: { ...build_auth_headers(config.key), prefer: "return=minimal" },
      body: JSON.stringify(row),
    });
    if (response.ok) {
      console.log(`[supabase] logged transfer payee="${row.payee}" amount=${row.amount}`);
    } else {
      console.warn(`[supabase] log transfer HTTP ${response.status} — continuing.`);
    }
  } catch (error) {
    console.error("[supabase] failed to log transfer — continuing:", error);
  } finally {
    clearTimeout(timeout);
  }
}
