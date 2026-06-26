/**
 * Sentinel extension service worker.
 *
 * Owns all network access. Content scripts send detected transfers here; this
 * worker scores them against the Sentinel API (cross-origin fetch is permitted
 * for hosts declared in `host_permissions`, with no CORS dependency) and returns
 * the firewall verdict. It also keeps a short history for the popup.
 */

const default_settings = {
  api_base: "http://localhost:3000",
  user_id: "user_aisha",
};
const request_timeout_ms = 35000;
const history_limit = 20;

/**
 * Loads persisted settings, falling back to demo defaults, and ensures a stable
 * per-installation device fingerprint exists.
 *
 * @returns The resolved API base, demo user id, and device id.
 */
async function load_settings() {
  const stored = await chrome.storage.local.get(["api_base", "user_id", "device_id"]);
  let device_id = stored.device_id;
  if (!device_id) {
    device_id = `ext_${crypto.randomUUID()}`;
    await chrome.storage.local.set({ device_id });
  }
  return {
    api_base: stored.api_base || default_settings.api_base,
    user_id: stored.user_id || default_settings.user_id,
    device_id,
  };
}

/**
 * Prepends a verdict record to the rolling history shown in the popup.
 *
 * @param record The transfer plus its assessment.
 */
async function push_history(record) {
  const stored = await chrome.storage.local.get(["history"]);
  const history = [record, ...(stored.history ?? [])].slice(0, history_limit);
  await chrome.storage.local.set({ history });
}

/**
 * Scores a detected transfer through the Sentinel API.
 *
 * @param detected The extracted transfer fields (payee, amount, origin).
 * @returns A `{ ok, assessment }` result, or `{ ok: false, error }` on failure.
 */
async function score_transfer(detected) {
  const settings = await load_settings();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), request_timeout_ms);

  try {
    const response = await fetch(`${settings.api_base}/api/transfer`, {
      method: "POST",
      signal: controller.signal,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: crypto.randomUUID(),
        user_id: settings.user_id,
        payee: detected.payee,
        amount: detected.amount,
        device: settings.device_id,
        geo: "MY",
        created_at: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      return { ok: false, error: `Sentinel API returned ${response.status}.` };
    }

    const assessment = await response.json();
    await push_history({
      payee: detected.payee,
      amount: detected.amount,
      origin: detected.origin,
      state: assessment.state,
      score: assessment.score,
      ai_used: assessment.ai_used,
      decided_at: new Date().toISOString(),
    });
    return { ok: true, assessment };
  } catch (error) {
    const reason = error instanceof Error && error.name === "AbortError" ? "timeout" : "network";
    return { ok: false, error: `Could not reach Sentinel (${reason}).` };
  } finally {
    clearTimeout(timeout);
  }
}

chrome.runtime.onMessage.addListener((message, _sender, send_response) => {
  if (message?.type === "SENTINEL_SCORE_TRANSFER") {
    score_transfer(message.payload).then(send_response);
    return true;
  }
  return false;
});
