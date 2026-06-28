/**
 * Content script. Intercepts the page's send action, screens the transfer
 * through the backend, and renders a blocking warning the user must dismiss
 * before the original action proceeds. It never moves or stops money itself —
 * it only interposes a warning, which is all a third party can legitimately do.
 */
(function initialize_sentinel_shield() {
  const adapter = window.__sentinel_resolve_adapter();
  const bypass_attribute = "data-sentinel-cleared";
  const minimum_spinner_ms = 5000;

  /**
   * Resolves after the given delay.
   * @param {number} ms Milliseconds to wait.
   * @returns {Promise<void>}
   */
  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Holds the spinner on screen for at least {@link minimum_spinner_ms} from the
   * given start time, so a fast verdict is still visibly "checked" rather than
   * flashing past the user.
   * @param {number} started_at Epoch ms when screening began.
   * @returns {Promise<void>}
   */
  async function enforce_minimum_spinner(started_at) {
    const remaining = minimum_spinner_ms - (Date.now() - started_at);
    if (remaining > 0) {
      await delay(remaining);
    }
  }

  /**
   * Sends the transfer to the background worker for screening.
   * @param {{payee: string, amount: number, memo?: string}} transfer
   * @returns {Promise<object>} The screening result.
   */
  function request_screening(transfer) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: "SENTINEL_SCREEN", transfer }, resolve);
    });
  }

  /**
   * Removes any existing overlay so warnings never stack.
   */
  function clear_overlay() {
    document.getElementById("sentinel-overlay")?.remove();
  }

  /**
   * Shows a blocking "checking" spinner the instant the send is intercepted, so
   * the user has immediate feedback that the transfer was caught and is being
   * screened rather than silently stalling.
   */
  function show_spinner() {
    clear_spinner();
    const spinner = document.createElement("div");
    spinner.id = "sentinel-spinner";
    spinner.className = "sentinel-overlay";
    spinner.innerHTML = `
      <div class="sentinel-card sentinel-spinner-card">
        <div class="sentinel-ring" aria-hidden="true"></div>
        <p class="sentinel-checking">AI is checking this transfer…</p>
      </div>`;
    document.body.appendChild(spinner);
  }

  /**
   * Removes the checking spinner if present.
   */
  function clear_spinner() {
    document.getElementById("sentinel-spinner")?.remove();
  }

  /**
   * Renders the warning overlay and resolves with the user's choice.
   * @param {object} result The screening result.
   * @returns {Promise<boolean>} True when the user chooses to send anyway.
   */
  function show_warning(result) {
    clear_overlay();
    return new Promise((resolve) => {
      const tone = result.advice === "block" ? "danger" : "warn";
      const overlay = document.createElement("div");
      overlay.id = "sentinel-overlay";
      overlay.className = `sentinel-overlay sentinel-${tone}`;
      overlay.innerHTML = `
        <div class="sentinel-card" role="alertdialog" aria-modal="true">
          <div class="sentinel-badge">${tone === "danger" ? "LIKELY SCAM" : "CHECK BEFORE YOU SEND"}</div>
          <p class="sentinel-reason"></p>
          <div class="sentinel-actions">
            <button class="sentinel-cancel" type="button">Cancel transfer</button>
            <button class="sentinel-proceed" type="button">Send anyway</button>
          </div>
        </div>`;
      overlay.querySelector(".sentinel-reason").textContent =
        result.reason || "This transfer looks unusual.";
      overlay.querySelector(".sentinel-cancel").addEventListener("click", () => {
        clear_overlay();
        resolve(false);
      });
      overlay.querySelector(".sentinel-proceed").addEventListener("click", () => {
        clear_overlay();
        resolve(true);
      });
      document.body.appendChild(overlay);
    });
  }

  /**
   * Capture-phase handler that screens the transfer before the page's own
   * handlers run. A cleared transfer is allowed straight through.
   * @param {MouseEvent} event
   */
  async function handle_send_click(event) {
    const button = event.target.closest(adapter.send_button_selector);
    if (!button || button.hasAttribute(bypass_attribute)) {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();

    const transfer = adapter.read_transfer();
    if (!transfer.payee || !Number.isFinite(transfer.amount) || transfer.amount <= 0) {
      proceed(button);
      return;
    }

    console.log("[sentinel] transfer intercepted:", transfer);
    show_spinner();
    const started_at = Date.now();
    const result = await request_screening(transfer);
    console.log(
      `[sentinel] verdict=${result.advice} score=${result.score ?? "?"} ai_used=${result.ai_used ?? false}`,
      result,
    );
    await enforce_minimum_spinner(started_at);
    clear_spinner();
    if (result.advice === "allow") {
      proceed(button);
      return;
    }

    const send_anyway = await show_warning(result);
    if (send_anyway) {
      proceed(button);
    }
  }

  /**
   * Marks the button as cleared and replays the original action so the bank's
   * own flow completes untouched.
   * @param {HTMLElement} button
   */
  function proceed(button) {
    button.setAttribute(bypass_attribute, "true");
    button.click();
    button.removeAttribute(bypass_attribute);
  }

  document.addEventListener("click", handle_send_click, true);
})();
