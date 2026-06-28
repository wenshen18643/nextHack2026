/**
 * Background service worker. It owns the network call so the screening request
 * runs with the extension's host permissions, sidestepping the page's CORS and
 * mixed-content restrictions. The content script never fetches directly.
 */

const default_api_base = "http://localhost:3000";
const screen_path = "/api/screen";

/**
 * Resolves the configured API base, allowing the deployed HTTPS endpoint to be
 * set without rebuilding the extension.
 * @returns {Promise<string>} The API base URL.
 */
async function resolve_api_base() {
  const stored = await chrome.storage.sync.get("api_base");
  return stored.api_base || default_api_base;
}

/**
 * Screens a transfer against the backend, returning a fail-open result so a
 * network error never blocks the user — a down service must not become a denial
 * of service on their own payments.
 * @param {{payee: string, amount: number, memo?: string}} transfer
 * @returns {Promise<object>} The screening result or a permissive fallback.
 */
async function screen_transfer(transfer) {
  try {
    const base = await resolve_api_base();
    console.log("[sentinel-bg] screening via", `${base}${screen_path}`, transfer);
    const response = await fetch(`${base}${screen_path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(transfer),
    });
    if (!response.ok) {
      console.warn("[sentinel-bg] screen endpoint returned", response.status);
      return { advice: "allow", reason: "Screening unavailable.", unavailable: true };
    }
    const result = await response.json();
    console.log("[sentinel-bg] screen result", result);
    return result;
  } catch (error) {
    console.error("[sentinel-bg] screen request failed", error);
    return { advice: "allow", reason: "Screening unavailable.", unavailable: true };
  }
}

chrome.runtime.onMessage.addListener((message, _sender, send_response) => {
  if (message?.type === "SENTINEL_SCREEN") {
    screen_transfer(message.transfer).then(send_response);
    return true;
  }
  return false;
});
