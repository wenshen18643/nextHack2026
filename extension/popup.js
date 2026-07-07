/**
 * Popup script. Three responsibilities:
 * 1. Settings — binds the site-adapter checkbox and backend override to
 *    chrome.storage.sync; the content script and background worker read these
 *    live, no page reload needed.
 * 2. Account — email/password sign-in against the screening backend, with the
 *    returned identity stored in chrome.storage.sync.
 * 3. Billing — starts a Stripe Checkout for the Pro upgrade in a new tab and
 *    reflects the entitlement from GET /api/billing/status.
 */

const adapter_preference_key = "use_site_adapters";
const api_base_key = "api_base";
const account_key = "account";
const default_api_base = "https://next-hack2026.vercel.app";
const request_timeout_ms = 10000;

const adapters_checkbox = document.getElementById("use-site-adapters");
const api_base_input = document.getElementById("api-base");
const api_base_status = document.getElementById("api-base-status");
const signed_out_section = document.getElementById("signed-out");
const signed_in_section = document.getElementById("signed-in");
const login_email_input = document.getElementById("login-email");
const login_password_input = document.getElementById("login-password");
const login_button = document.getElementById("login-button");
const login_status = document.getElementById("login-status");
const account_email_label = document.getElementById("account-email");
const plan_badge = document.getElementById("plan-badge");
const upgrade_button = document.getElementById("upgrade-button");
const billing_status = document.getElementById("billing-status");
const signout_button = document.getElementById("signout-button");

/**
 * Reads the effective backend base URL: the stored override or the default.
 * @returns {Promise<string>} The base URL without a trailing slash.
 */
function resolve_api_base() {
  return new Promise((resolve) => {
    chrome.storage.sync.get({ [api_base_key]: "" }, (stored) => {
      resolve(stored[api_base_key] || default_api_base);
    });
  });
}

/**
 * Performs one JSON request against the screening backend with a hard timeout.
 * @param {string} path The API path, e.g. /api/auth/login.
 * @param {RequestInit} [init] Fetch options; JSON content type is added for bodies.
 * @returns {Promise<{status: number, json: object} | null>} Response, or null on transport failure.
 */
async function call_backend(path, init = {}) {
  const base = await resolve_api_base();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), request_timeout_ms);
  try {
    const response = await fetch(`${base}${path}`, {
      ...init,
      signal: controller.signal,
      headers: init.body ? { "content-type": "application/json" } : undefined,
    });
    const json = await response.json().catch(() => ({}));
    return { status: response.status, json };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

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

/**
 * Switches the account section between signed-out and signed-in views.
 * @param {{user_id: string, email: string} | null} account The stored account, or null.
 */
function render_account(account) {
  signed_out_section.classList.toggle("hidden", Boolean(account));
  signed_in_section.classList.toggle("hidden", !account);
  if (account) {
    account_email_label.textContent = account.email;
  }
}

/**
 * Paints the plan badge and upgrade button for the given entitlement.
 * @param {boolean} is_pro Whether the account holds the Pro entitlement.
 */
function render_plan(is_pro) {
  plan_badge.textContent = is_pro ? "Pro" : "Free";
  plan_badge.className = `badge ${is_pro ? "pro" : "free"}`;
  upgrade_button.classList.toggle("hidden", is_pro);
  billing_status.textContent = is_pro ? "All Pro protections are active." : "";
}

/**
 * Fetches the entitlement for the stored account and repaints the plan UI.
 * @param {{user_id: string}} account The signed-in account.
 */
async function refresh_plan(account) {
  const result = await call_backend(
    `/api/billing/status?user_id=${encodeURIComponent(account.user_id)}`,
  );
  if (result && result.status === 200 && result.json.ok) {
    render_plan(result.json.is_pro === true);
  } else {
    render_plan(false);
    billing_status.textContent = "Could not check your plan right now.";
  }
}

login_button.addEventListener("click", async () => {
  const email = login_email_input.value.trim();
  const password = login_password_input.value;
  if (!email || !password) {
    login_status.textContent = "Enter your email and password.";
    login_status.className = "error";
    return;
  }
  login_button.disabled = true;
  login_status.textContent = "Signing in…";
  login_status.className = "";

  const result = await call_backend("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  login_button.disabled = false;

  if (!result) {
    login_status.textContent = "Could not reach the backend.";
    login_status.className = "error";
    return;
  }
  if (result.status !== 200 || !result.json.ok || !result.json.user) {
    login_status.textContent = result.json.error || "Sign-in failed.";
    login_status.className = "error";
    return;
  }

  const account = result.json.user;
  chrome.storage.sync.set({ [account_key]: account }, () => {
    login_password_input.value = "";
    login_status.textContent = "";
    render_account(account);
    refresh_plan(account);
  });
});

upgrade_button.addEventListener("click", async () => {
  chrome.storage.sync.get({ [account_key]: null }, async (stored) => {
    const account = stored[account_key];
    if (!account) {
      return;
    }
    upgrade_button.disabled = true;
    billing_status.textContent = "Opening secure checkout…";

    const result = await call_backend("/api/billing/checkout", {
      method: "POST",
      body: JSON.stringify({ user_id: account.user_id, email: account.email }),
    });
    upgrade_button.disabled = false;

    if (result && result.status === 200 && result.json.ok && result.json.url) {
      billing_status.textContent = "Complete payment in the new tab, then reopen this popup.";
      chrome.tabs.create({ url: result.json.url });
    } else {
      billing_status.textContent =
        (result && result.json.error) || "Could not start checkout. Try again.";
    }
  });
});

signout_button.addEventListener("click", () => {
  chrome.storage.sync.remove(account_key, () => {
    render_account(null);
  });
});

chrome.storage.sync.get(
  { [adapter_preference_key]: true, [api_base_key]: "", [account_key]: null },
  (stored) => {
    adapters_checkbox.checked = stored[adapter_preference_key] !== false;
    api_base_input.value = stored[api_base_key];
    render_api_base_status(stored[api_base_key]);
    render_account(stored[account_key]);
    if (stored[account_key]) {
      refresh_plan(stored[account_key]);
    }
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
