/**
 * Popup script. Binds the "use site-specific adapters" checkbox and the
 * screening-backend override to chrome.storage.sync. The content script and
 * background worker read these live — no page reload is needed after changes.
 */

const adapter_preference_key = "use_site_adapters";
const api_base_key = "api_base";
const default_api_base = "https://next-hack2026.vercel.app";

const adapters_checkbox = document.getElementById("use-site-adapters");
const api_base_input = document.getElementById("api-base");
const api_base_status = document.getElementById("api-base-status");

/**
 * Shows which backend screening requests will actually hit, so the active
 * target is always visible without opening the service worker console.
 * @param {string} stored_base The stored override, or an empty string.
 */
function render_api_base_status(stored_base) {
  const effective = stored_base || default_api_base;
  const mode = stored_base ? "override" : "default";
  api_base_status.textContent = `Screening via ${effective} (${mode}). Leave blank for default.`;
}

chrome.storage.sync.get(
  { [adapter_preference_key]: true, [api_base_key]: "" },
  (stored) => {
    adapters_checkbox.checked = stored[adapter_preference_key] !== false;
    api_base_input.value = stored[api_base_key];
    render_api_base_status(stored[api_base_key]);
  },
);

adapters_checkbox.addEventListener("change", () => {
  chrome.storage.sync.set({ [adapter_preference_key]: adapters_checkbox.checked });
});

api_base_input.addEventListener("change", () => {
  const base = api_base_input.value.trim().replace(/\/+$/, "");
  api_base_input.value = base;
  if (base) {
    chrome.storage.sync.set({ [api_base_key]: base });
  } else {
    chrome.storage.sync.remove(api_base_key);
  }
  render_api_base_status(base);
});
