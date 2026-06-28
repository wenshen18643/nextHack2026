/**
 * Per-site field selectors. This is the ONLY file to edit when a bank changes
 * its markup or a new bank is added — the content script stays untouched.
 *
 * Each adapter resolves the three fields the screener needs from the page. A
 * generic heuristic adapter is the fallback so an unconfigured site still has a
 * chance of working before a precise adapter is written for it.
 */

/**
 * Reads the trimmed value of the first element matching any of the selectors.
 * @param {string[]} selectors Candidate CSS selectors, tried in order.
 * @returns {string} The matched value, or an empty string.
 */
function read_first_value(selectors) {
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element && "value" in element && element.value) {
      return String(element.value).trim();
    }
  }
  return "";
}

/**
 * Heuristic adapter for unconfigured sites: guesses fields from input name,
 * id, placeholder, and aria-label keywords.
 */
const generic_adapter = {
  send_button_selector:
    "button[type=submit], button[id*=transfer i], button[id*=send i], [data-sentinel-send]",
  read_transfer() {
    const amount_raw = read_first_value([
      "[data-sentinel-amount]",
      "input[name*=amount i]",
      "input[id*=amount i]",
      "input[placeholder*=amount i]",
    ]);
    const payee = read_first_value([
      "[data-sentinel-payee]",
      "input[name*=payee i]",
      "input[name*=recipient i]",
      "input[id*=account i]",
      "input[placeholder*=recipient i]",
    ]);
    const memo = read_first_value([
      "[data-sentinel-memo]",
      "input[name*=reference i]",
      "input[name*=memo i]",
      "input[id*=description i]",
    ]);
    return { payee, amount: Number(amount_raw.replace(/[^0-9.]/g, "")), memo };
  },
};

/**
 * Reads the trimmed value or visible text of the first matching element,
 * tolerating both form fields (.value) and rendered widgets (textContent) such
 * as a select2 selection span.
 * @param {string[]} selectors Candidate CSS selectors, tried in order.
 * @returns {string} The matched value or text, or an empty string.
 */
function read_value_or_text(selectors) {
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (!element) {
      continue;
    }
    const raw = "value" in element && element.value ? element.value : element.textContent;
    if (raw && raw.trim()) {
      return raw.trim();
    }
  }
  return "";
}

/**
 * Adapter for CIMB Clicks. The recipient is a select2 autocomplete whose chosen
 * value may live in the typed input or in a rendered selection span, so both are
 * tried. The send button ("Transfer Money") advances to the review step, so the
 * warning surfaces before any OTP, which is the ideal interception point.
 */
const cimb_adapter = {
  send_button_selector: "button.btn-primary.scroll",
  read_transfer() {
    const amount_raw = read_value_or_text([
      "input[name=amount]",
      "input.currency",
    ]);
    const payee = read_value_or_text([
      ".select2-selection__rendered",
      "input.select2",
      "input[placeholder^='Recipient']",
      "input.toBilling",
    ]);
    const memo = read_value_or_text([
      "#recipient-reference-extended-length-textarea",
      "textarea[id^='recipient-reference']",
    ]);
    return { payee, amount: Number(amount_raw.replace(/[^0-9.]/g, "")), memo };
  },
};

/**
 * Adapter for the local demo bank page, which exposes explicit data attributes
 * so the demo is deterministic regardless of styling.
 */
const demo_adapter = {
  send_button_selector: "[data-sentinel-send]",
  read_transfer() {
    return {
      payee: read_first_value(["[data-sentinel-payee]"]),
      amount: Number(read_first_value(["[data-sentinel-amount]"]).replace(/[^0-9.]/g, "")),
      memo: read_first_value(["[data-sentinel-memo]"]),
    };
  },
};

const adapters_by_host = {
  "localhost": demo_adapter,
  "www.cimbclicks.com.my": cimb_adapter,
};

/**
 * Resolves the adapter for the current host, falling back to the heuristic
 * adapter so unconfigured banks degrade gracefully rather than failing closed.
 * @returns The active site adapter.
 */
function resolve_site_adapter() {
  return adapters_by_host[window.location.hostname] ?? generic_adapter;
}

window.__sentinel_resolve_adapter = resolve_site_adapter;
