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

const payee_review_labels = [
  "transfer to",
  "transfer to account",
  "recipient",
  "recipient name",
  "recipient's name",
  "recipient account",
  "recipient account number",
  "beneficiary",
  "beneficiary name",
  "beneficiary account",
  "beneficiary account number",
  "beneficiary account no",
  "account holder name",
  "account holder",
  "receiver",
  "receiver name",
  "pay to",
  "payee",
  "payee name",
  "to account",
  "to account number",
  "credit to",
  "credit account",
  "send to",
  "duitnow id",
  "transfer to duitnow id",
  "proxy id",
  "penerima",
  "nama penerima",
  "akaun penerima",
  "nombor akaun penerima",
  "pindah kepada",
  "pindahan kepada",
  "kepada akaun",
  "benefisiari",
  "nama benefisiari",
  "pemegang akaun",
  "id duitnow",
];
const amount_review_labels = [
  "amount",
  "amount (rm)",
  "amount (myr)",
  "amount rm",
  "amount myr",
  "transfer amount",
  "transfer amount (rm)",
  "transfer amount (myr)",
  "transaction amount",
  "payment amount",
  "debit amount",
  "total debit amount",
  "amount to transfer",
  "you are paying",
  "total amount",
  "total payment",
  "total transfer",
  "total",
  "total (rm)",
  "total (myr)",
  "grand total",
  "amaun",
  "amaun (rm)",
  "amaun pindahan",
  "amaun pemindahan",
  "jumlah",
  "jumlah amaun",
  "jumlah pindahan",
  "jumlah bayaran",
  "jumlah keseluruhan",
];
const memo_review_labels = [
  "reference",
  "reference (optional)",
  "recipient reference",
  "payment reference",
  "payment details",
  "other payment details",
  "payment description",
  "transfer details",
  "details",
  "description",
  "memo",
  "note",
  "notes",
  "remarks",
  "purpose",
  "purpose of transfer",
  "payment purpose",
  "rujukan",
  "rujukan penerima",
  "rujukan pembayaran",
  "butiran",
  "butiran pembayaran",
  "butiran pembayaran lain",
  "keterangan",
  "catatan",
  "tujuan",
  "tujuan pemindahan",
  "maklumat pembayaran",
];
const all_review_labels = new Set([
  ...payee_review_labels,
  ...amount_review_labels,
  ...memo_review_labels,
]);
const max_review_value_length = 160;
const ringgit_amount_pattern = /(?:RM|MYR)\s*([0-9][\d,]*(?:\.\d{1,2})?)/gi;
const send_button_text_pattern =
  /\b(confirm|transfer|send|proceed|pay|agree|submit|continue|next|accept|authorise|authorize|sahkan|hantar|bayar|teruskan|pindah|pemindahan|seterusnya|setuju)\b/i;
const blocked_button_text_pattern =
  /\b(back|cancel|edit|add|save|close|clear|reset|delete|remove|logout|another|receipt|batal|kembali|semula|tutup|padam|keluar)\b/i;

/**
 * Lowercases, collapses whitespace, and strips trailing colons/asterisks so
 * "Recipient Name :*" and "recipient name" compare equal.
 * @param {string} text Raw label or value text.
 * @returns {string} The normalized text.
 */
function normalize_label_text(text) {
  return text.trim().toLowerCase().replace(/\s+/g, " ").replace(/[:*\s]+$/, "");
}

/**
 * Finds the value paired with a label on a rendered review/confirmation page.
 * Banks lay these out as table rows, definition lists, or sibling divs, so the
 * value is looked up as the label's next sibling or its parent's next sibling.
 * @param {string[]} labels Normalized label texts to match exactly.
 * @returns {string} The paired value text, or an empty string.
 */
function read_review_labeled_value(labels) {
  const label_set = new Set(labels);
  for (const element of document.querySelectorAll(
    "th, td, dt, dd, div, span, label, p, strong, b",
  )) {
    if (!label_set.has(normalize_label_text(element.textContent || ""))) {
      continue;
    }
    const candidates = [element.nextElementSibling, element.parentElement?.nextElementSibling];
    for (const candidate of candidates) {
      const value = candidate?.textContent?.trim() ?? "";
      if (
        value &&
        value.length <= max_review_value_length &&
        !all_review_labels.has(normalize_label_text(value))
      ) {
        return value;
      }
    }
  }
  return "";
}

/**
 * Parses a numeric amount out of text such as "RM 5,000.00" or "5000".
 * @param {string} text Raw amount text.
 * @returns {number} The parsed amount, or NaN when no digits are present.
 */
function parse_amount(text) {
  return Number(text.replace(/[^0-9.]/g, ""));
}

/**
 * Scans the page's visible text for ringgit-denominated amounts and returns
 * the largest, the last-resort amount signal when no labeled amount is found.
 * On a review page the transfer amount dominates any fee also shown.
 * @returns {number} The largest amount found, or NaN when none is present.
 */
function find_largest_ringgit_amount() {
  let largest = NaN;
  for (const match of document.body.innerText.matchAll(ringgit_amount_pattern)) {
    const amount = parse_amount(match[1]);
    if (Number.isFinite(amount) && !(amount <= largest)) {
      largest = amount;
    }
  }
  return largest;
}

/**
 * Reads the transfer from live form inputs, the pre-review reading used when
 * the send action fires directly from the entry form.
 * @returns {{payee: string, amount: number, memo: string}} The form reading.
 */
function read_transfer_from_form_inputs() {
  const amount_raw = read_first_value([
    "input[name*=amount i]",
    "input[id*=amount i]",
    "input[placeholder*=amount i]",
  ]);
  const payee = read_first_value([
    "input[name*=payee i]",
    "input[name*=recipient i]",
    "input[id*=account i]",
    "input[placeholder*=recipient i]",
  ]);
  const memo = read_first_value([
    "input[name*=reference i]",
    "input[name*=memo i]",
    "input[id*=description i]",
  ]);
  return { payee, amount: parse_amount(amount_raw), memo };
}

/**
 * Reads the transfer from a rendered review/confirmation page, where payee and
 * amount appear as labeled plain text rather than inputs. This is the reading
 * that generalizes across banks whose forms were never individually adapted.
 * @returns {{payee: string, amount: number, memo: string}} The review reading.
 */
function read_transfer_from_review_page() {
  const labeled_amount = read_review_labeled_value(amount_review_labels);
  const amount = labeled_amount ? parse_amount(labeled_amount) : find_largest_ringgit_amount();
  return {
    payee: read_review_labeled_value(payee_review_labels),
    amount,
    memo: read_review_labeled_value(memo_review_labels),
  };
}

/**
 * Heuristic adapter for unconfigured sites. Send buttons are matched broadly
 * by selector then narrowed by visible text, and the transfer is read from
 * form inputs first with the review-page text scan as the fallback, so both
 * the entry form and the pre-OTP review step are covered without site config.
 */
const generic_adapter = {
  send_button_selector: "button, input[type=submit], input[type=button], [role=button]",
  is_send_button(button) {
    const label = ("value" in button && button.value ? button.value : button.textContent) || "";
    return send_button_text_pattern.test(label) && !blocked_button_text_pattern.test(label);
  },
  read_transfer() {
    const form_reading = read_transfer_from_form_inputs();
    if (form_reading.payee && Number.isFinite(form_reading.amount) && form_reading.amount > 0) {
      return form_reading;
    }
    const review_reading = read_transfer_from_review_page();
    return {
      payee: form_reading.payee || review_reading.payee,
      amount:
        Number.isFinite(form_reading.amount) && form_reading.amount > 0
          ? form_reading.amount
          : review_reading.amount,
      memo: form_reading.memo || review_reading.memo,
    };
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

const hlb_proxy_type_labels = [
  "mobile number",
  "nric number",
  "ic number",
  "passport number",
  "army identification number",
  "police identification number",
  "business registration number",
];

/**
 * Reads the value cell paired with a label cell in Hong Leong Connect's
 * summary tables, which render every field as
 * `<td class="tbl_col_label">Label</td><td>Value</td>`. When the value cell
 * holds both an on-screen span and a masked print-only span, the on-screen
 * one (#idProxyIdIgnorePrint) is preferred so the unmasked value is read.
 * @param {string[]} labels Normalized label texts to match exactly.
 * @returns {string} The paired value text, or an empty string.
 */
function read_hlb_summary_value(labels) {
  const label_set = new Set(labels);
  for (const cell of document.querySelectorAll("td.tbl_col_label")) {
    if (!label_set.has(normalize_label_text(cell.textContent || ""))) {
      continue;
    }
    const value_cell = cell.nextElementSibling;
    if (!value_cell) {
      continue;
    }
    const on_screen_span = value_cell.querySelector("#idProxyIdIgnorePrint");
    const value = (on_screen_span ?? value_cell).textContent.trim();
    if (value) {
      return value;
    }
  }
  return "";
}

/**
 * Adapter for Hong Leong Connect (s.hongleongconnect.my). The transfer flow
 * renders entry, confirmation, and receipt steps at one URL inside the
 * idMainFrame iframe; the confirmation/summary steps lay every field out in
 * tbl_col_label tables, which is where the transfer is read. On the entry
 * form these tables carry no text values yet, so the read comes back empty
 * and screening waits for the confirmation step — the ideal pre-OTP point.
 */
const hlb_adapter = {
  send_button_selector: "input[type=submit], button, [role=button]",
  is_send_button(button) {
    const label = ("value" in button && button.value ? button.value : button.textContent) || "";
    return send_button_text_pattern.test(label) && !blocked_button_text_pattern.test(label);
  },
  read_transfer() {
    const payee =
      read_hlb_summary_value(["recipient name"]) ||
      read_hlb_summary_value(hlb_proxy_type_labels);
    const amount_raw = read_hlb_summary_value([
      "transfer amount (myr)",
      "transfer amount",
      "total amount (myr)",
    ]);
    const memo =
      read_hlb_summary_value(["other payment detail", "other payment details"]) ||
      read_hlb_summary_value(["recipient reference"]);
    return { payee, amount: parse_amount(amount_raw), memo };
  },
};

const adapters_by_host = {
  "cimbclicks.com.my": cimb_adapter,
  "hongleongconnect.my": hlb_adapter,
};

/**
 * Resolves the adapter for the current host by exact or parent-domain match,
 * so "www." and login-subdomain variants share one adapter entry. Unmatched
 * hosts fall back to the generic adapter rather than failing closed.
 * @param {boolean} use_site_adapters When false, hand-written adapters are
 *   bypassed and the generic adapter is used everywhere, which lets the
 *   generic reader be exercised on hosts that normally have a precise adapter.
 * @returns The active site adapter.
 */
function resolve_site_adapter(use_site_adapters) {
  if (!use_site_adapters) {
    return generic_adapter;
  }
  const host = window.location.hostname;
  const matched_domain = Object.keys(adapters_by_host).find(
    (domain) => host === domain || host.endsWith(`.${domain}`),
  );
  return matched_domain ? adapters_by_host[matched_domain] : generic_adapter;
}

window.__sentinel_resolve_adapter = resolve_site_adapter;
