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
 * One row of the shared scam-account blocklist.
 *
 * @property payee_key Normalized recipient key (trimmed, lowercased).
 * @property payee     Recipient display name as first observed.
 * @property reason    Why the account was flagged.
 * @property source    Who flagged it: 'manual' (team) or 'ai' (adjudicator).
 */
export interface FlaggedAccountRecord {
  payee_key: string;
  payee: string;
  reason: string;
  source: "manual" | "ai";
}

/**
 * Looks up one recipient in the shared scam-account blocklist.
 *
 * Fail-safe: configuration gaps, timeouts, and HTTP errors resolve to null so
 * the screen proceeds without the blocklist signal rather than failing.
 *
 * @param payee_key The normalized recipient key to look up.
 * @returns The blocklist row, or null when absent or unavailable.
 */
export async function fetch_flagged_account(
  payee_key: string,
): Promise<FlaggedAccountRecord | null> {
  const config = resolve_supabase_config();
  if (!config) {
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), request_timeout_ms);

  try {
    const query = new URLSearchParams({
      payee_key: `eq.${payee_key}`,
      select: "payee_key,payee,reason,source",
      limit: "1",
    });
    const response = await fetch(`${config.url}/rest/v1/flagged_accounts?${query}`, {
      signal: controller.signal,
      headers: build_auth_headers(config.key),
    });
    if (!response.ok) {
      console.warn(`[supabase] flagged account lookup HTTP ${response.status} — skipping.`);
      return null;
    }
    const rows = (await response.json()) as FlaggedAccountRecord[];
    return rows[0] ?? null;
  } catch (error) {
    console.error("[supabase] flagged account lookup failed — skipping:", error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Adds one recipient to the shared scam-account blocklist.
 *
 * Duplicate-safe: inserts ignore an existing row for the same payee_key, so the
 * first flag (often a manual seed) is never overwritten by a later one.
 *
 * @param row The blocklist entry to add.
 * @returns True when the row was stored (or already existed), false otherwise.
 */
export async function insert_flagged_account(row: FlaggedAccountRecord): Promise<boolean> {
  const config = resolve_supabase_config();
  if (!config) {
    return false;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), request_timeout_ms);

  try {
    const response = await fetch(
      `${config.url}/rest/v1/flagged_accounts?on_conflict=payee_key`,
      {
        method: "POST",
        signal: controller.signal,
        headers: {
          ...build_auth_headers(config.key),
          prefer: "resolution=ignore-duplicates,return=minimal",
        },
        body: JSON.stringify(row),
      },
    );
    if (response.ok) {
      console.log(`[supabase] blocklisted payee_key="${row.payee_key}" source=${row.source}`);
    } else {
      console.warn(`[supabase] blocklist insert HTTP ${response.status} — continuing.`);
    }
    return response.ok;
  } catch (error) {
    console.error("[supabase] blocklist insert failed — continuing:", error);
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * One stored user profile, as read back for screening enrichment.
 *
 * @property full_name  The user's display name.
 * @property birth_year The birth year collected at signup.
 */
export interface ProfileRecord {
  full_name: string;
  birth_year: number;
}

/**
 * Reads one user's profile by Supabase auth user id.
 *
 * Fail-safe: configuration gaps, timeouts, and HTTP errors resolve to null so
 * screening proceeds without sender enrichment rather than failing.
 *
 * @param user_id The Supabase auth user id from the session.
 * @returns The profile, or null when absent or unavailable.
 */
export async function fetch_profile_record(user_id: string): Promise<ProfileRecord | null> {
  const config = resolve_supabase_config();
  if (!config) {
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), request_timeout_ms);

  try {
    const query = new URLSearchParams({
      id: `eq.${user_id}`,
      select: "full_name,birth_year",
      limit: "1",
    });
    const response = await fetch(`${config.url}/rest/v1/profiles?${query}`, {
      signal: controller.signal,
      headers: build_auth_headers(config.key),
    });
    if (!response.ok) {
      console.warn(`[supabase] profile lookup HTTP ${response.status} — skipping.`);
      return null;
    }
    const rows = (await response.json()) as ProfileRecord[];
    return rows[0] ?? null;
  } catch (error) {
    console.error("[supabase] profile lookup failed — skipping:", error);
    return null;
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

/**
 * Reads one user's Pro entitlement flag by Supabase auth user id.
 *
 * Fail-safe: configuration gaps, timeouts, and HTTP errors resolve to null so
 * callers can distinguish "not pro" from "could not check".
 *
 * @param user_id The Supabase auth user id.
 * @returns True/false when the profile was found, null when unavailable.
 */
export async function fetch_pro_status(user_id: string): Promise<boolean | null> {
  const config = resolve_supabase_config();
  if (!config) {
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), request_timeout_ms);

  try {
    const query = new URLSearchParams({
      id: `eq.${user_id}`,
      select: "is_pro",
      limit: "1",
    });
    const response = await fetch(`${config.url}/rest/v1/profiles?${query}`, {
      signal: controller.signal,
      headers: build_auth_headers(config.key),
    });
    if (!response.ok) {
      console.warn(`[supabase] pro status lookup HTTP ${response.status} — skipping.`);
      return null;
    }
    const rows = (await response.json()) as Array<{ is_pro: boolean }>;
    return rows[0] ? rows[0].is_pro === true : null;
  } catch (error) {
    console.error("[supabase] pro status lookup failed — skipping:", error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Marks one user's profile as Pro after a verified Stripe payment.
 *
 * NOT best-effort: the webhook must know whether the entitlement was stored so
 * Stripe can retry delivery on failure.
 *
 * @param user_id            The Supabase auth user id from client_reference_id.
 * @param stripe_customer_id The Stripe customer id from the Checkout Session.
 * @returns True when exactly this profile row was updated, false otherwise.
 */
export async function mark_profile_pro(
  user_id: string,
  stripe_customer_id: string | null,
): Promise<boolean> {
  const config = resolve_supabase_config();
  if (!config) {
    return false;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), request_timeout_ms);

  try {
    const query = new URLSearchParams({ id: `eq.${user_id}` });
    const response = await fetch(`${config.url}/rest/v1/profiles?${query}`, {
      method: "PATCH",
      signal: controller.signal,
      headers: {
        ...build_auth_headers(config.key),
        prefer: "return=representation",
      },
      body: JSON.stringify({
        is_pro: true,
        stripe_customer_id,
        pro_since: new Date().toISOString(),
      }),
    });
    if (!response.ok) {
      console.warn(`[supabase] mark pro HTTP ${response.status}.`);
      return false;
    }
    const rows = (await response.json()) as unknown[];
    return rows.length === 1;
  } catch (error) {
    console.error("[supabase] mark pro failed:", error);
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * One stored screened transfer, as read back for the user dashboard.
 */
export interface TransferRecord {
  id: string;
  user_id: string | null;
  payee: string;
  payee_key: string;
  amount: number;
  memo: string | null;
  currency: string;
  channel: string;
  advice: string;
  score: number;
  state: string;
  created_at: string;
}

/**
 * Reads the screened transfers for one user, newest first.
 *
 * Fail-safe: configuration gaps, timeouts, and HTTP errors resolve to an empty
 * array so the dashboard can render gracefully.
 *
 * @param user_id The Supabase auth user id from the session.
 * @returns The user's transfer history, or an empty array when unavailable.
 */
export async function fetch_transfers_for_user(user_id: string): Promise<TransferRecord[]> {
  const config = resolve_supabase_config();
  if (!config) {
    return [];
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), request_timeout_ms);

  try {
    const query = new URLSearchParams({
      user_id: `eq.${user_id}`,
      select: "id,user_id,payee,payee_key,amount,memo,currency,channel,advice,score,state,created_at",
      order: "created_at.desc",
      limit: "200",
    });
    const response = await fetch(`${config.url}/rest/v1/transfers?${query}`, {
      signal: controller.signal,
      headers: build_auth_headers(config.key),
    });
    if (!response.ok) {
      console.warn(`[supabase] transfers lookup HTTP ${response.status} — returning empty.`);
      return [];
    }
    return (await response.json()) as TransferRecord[];
  } catch (error) {
    console.error("[supabase] transfers lookup failed — returning empty:", error);
    return [];
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
