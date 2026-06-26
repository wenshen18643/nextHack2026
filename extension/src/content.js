/**
 * Sentinel content script.
 *
 * Detects an in-progress web bank or e-wallet transfer, pauses it at the moment
 * of confirmation, sends it to the service worker for AI risk scoring, and lets
 * the user proceed or cancel based on an explainable verdict overlay.
 *
 * It cannot touch native mobile apps; it operates only on web pages matched in
 * the manifest. Detection uses explicit data attributes when a site exposes
 * them, otherwise generic heuristics over form fields and button text.
 */

(function initialize_sentinel() {
  const confirm_keywords = /(transfer|send money|send|pay now|make payment|confirm|bayar|hantar|duitnow)/i;
  const amount_pattern = /(?:rm|myr)?\s*([\d,]+(?:\.\d{1,2})?)/i;

  let bypass_next_activation = false;
  let is_screening = false;

  /**
   * Reads a numeric amount from explicit attributes, labelled inputs, or visible
   * "RM" text, returning null when no plausible amount is found.
   */
  function detect_amount(scope) {
    const tagged = scope.querySelector("[data-sentinel-amount]");
    if (tagged) {
      const value = Number(tagged.getAttribute("data-sentinel-amount"));
      if (Number.isFinite(value) && value > 0) {
        return value;
      }
    }

    const field = scope.querySelector(
      "input[name*='amount' i], input[id*='amount' i], input[placeholder*='amount' i]",
    );
    if (field && field.value) {
      const value = Number(field.value.replace(/[^\d.]/g, ""));
      if (Number.isFinite(value) && value > 0) {
        return value;
      }
    }

    const match = scope.textContent?.match(amount_pattern);
    if (match) {
      const value = Number(match[1].replace(/,/g, ""));
      if (Number.isFinite(value) && value > 0) {
        return value;
      }
    }
    return null;
  }

  /**
   * Reads the payee from explicit attributes or recipient-like inputs, falling
   * back to a generic label so a transfer is never dropped for a missing name.
   */
  function detect_payee(scope) {
    const tagged = scope.querySelector("[data-sentinel-payee]");
    if (tagged) {
      return tagged.getAttribute("data-sentinel-payee") || "web_payee";
    }
    const field = scope.querySelector(
      "input[name*='payee' i], input[name*='recipient' i], input[name*='beneficiary' i], input[name*='account' i], input[name*='to' i]",
    );
    if (field && field.value) {
      return field.value.trim();
    }
    return "web_payee";
  }

  /**
   * Determines whether an activated element is a transfer-confirmation control.
   */
  function is_confirmation_control(element) {
    if (!element) {
      return false;
    }
    const control = element.closest(
      "button, input[type='submit'], [role='button'], a[href='#'], [data-sentinel-confirm]",
    );
    if (!control) {
      return false;
    }
    if (control.hasAttribute("data-sentinel-confirm")) {
      return true;
    }
    const label = (control.innerText || control.value || "").trim();
    return label.length > 0 && label.length < 40 && confirm_keywords.test(label);
  }

  /**
   * Extracts transfer fields from the form containing the control, or the
   * document when the control sits outside a form.
   */
  function extract_transfer(control) {
    const scope = control.closest("form") || document.body;
    const amount = detect_amount(scope);
    const payee = detect_payee(scope);
    return amount === null ? null : { amount, payee, origin: location.hostname };
  }

  /**
   * Asks the service worker to score a transfer.
   */
  function request_score(payload) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: "SENTINEL_SCORE_TRANSFER", payload }, resolve);
    });
  }

  /**
   * Re-activates the original control after the user chooses to proceed, marking
   * the activation so the firewall does not intercept it a second time.
   */
  function release_transfer(control) {
    bypass_next_activation = true;
    control.click();
  }

  function build_overlay(assessment, detected, control, remove) {
    const blocked = assessment.state === "DENY";
    const cautioned = assessment.state === "INSPECT" || assessment.state === "QUARANTINE";

    const root = document.createElement("div");
    root.className = "sentinel-overlay";
    root.innerHTML = `
      <div class="sentinel-card">
        <div class="sentinel-head sentinel-${assessment.state.toLowerCase()}">
          <span class="sentinel-badge">${assessment.state}</span>
          <span class="sentinel-score">${Math.round(assessment.score)}<small>risk</small></span>
        </div>
        <p class="sentinel-amount">RM ${detected.amount} → ${detected.payee}</p>
        <p class="sentinel-reason">${assessment.reason}</p>
        ${assessment.ai_used ? '<p class="sentinel-ai">⚡ Flagged by Kimi AI adjudication</p>' : ""}
        <div class="sentinel-actions"></div>
      </div>`;

    const actions = root.querySelector(".sentinel-actions");
    const cancel = document.createElement("button");
    cancel.className = "sentinel-btn sentinel-cancel";
    cancel.textContent = blocked ? "Cancel transfer" : "Stop, this looks risky";
    cancel.addEventListener("click", remove);
    actions.appendChild(cancel);

    if (!blocked) {
      const proceed = document.createElement("button");
      proceed.className = "sentinel-btn sentinel-proceed";
      proceed.textContent = cautioned ? "I trust this, proceed" : "Proceed";
      proceed.addEventListener("click", () => {
        remove();
        release_transfer(control);
      });
      actions.appendChild(proceed);
    }

    return root;
  }

  function show_spinner() {
    const root = document.createElement("div");
    root.className = "sentinel-overlay";
    root.innerHTML = `
      <div class="sentinel-card sentinel-loading">
        <div class="sentinel-spinner"></div>
        <p class="sentinel-amount">Sentinel is screening this transfer…</p>
        <p class="sentinel-reason">Kimi AI may take 25-30 seconds to reason about scam risk.</p>
      </div>`;
    document.body.appendChild(root);
    return () => root.remove();
  }

  async function intercept(event) {
    if (bypass_next_activation) {
      bypass_next_activation = false;
      return;
    }
    if (is_screening || !is_confirmation_control(event.target)) {
      return;
    }
    const control = event.target.closest(
      "button, input[type='submit'], [role='button'], a[href='#'], [data-sentinel-confirm]",
    );
    const detected = extract_transfer(control);
    if (!detected) {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
    is_screening = true;
    const hide_spinner = show_spinner();

    const result = await request_score(detected);
    hide_spinner();
    is_screening = false;

    if (!result || !result.ok) {
      release_transfer(control);
      return;
    }

    const overlay = build_overlay(result.assessment, detected, control, () => overlay.remove());
    document.body.appendChild(overlay);
  }

  document.addEventListener("click", intercept, true);
})();
