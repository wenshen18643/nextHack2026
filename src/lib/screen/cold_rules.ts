import type { RiskSignal } from "@/lib/risk/types";

const high_absolute_amount = 5000;
const high_absolute_weight = 22;
const round_amount_modulus = 1000;
const round_amount_min = 1000;
const round_amount_weight = 12;
const scam_keyword_weight = 30;

/**
 * Lowercased substrings that recur in authorized-push-payment scam scripts:
 * fake investments, impersonation, and urgency. Matched against the payee name
 * and any memo the page exposes.
 */
const scam_keywords = [
  "invest",
  "crypto",
  "guarantee",
  "urgent",
  "prize",
  "refund",
  "police",
  "bank officer",
  "loan",
  "lottery",
  "bitcoin",
  "double your",
];

/**
 * A transfer as seen by a browser extension: the only fields a bank page
 * reliably exposes at send time, with no access to the user's history.
 *
 * @property payee  The recipient name or account as shown on the page.
 * @property amount The transfer amount in the account currency.
 * @property memo   Optional reference/description the user typed.
 */
export interface ColdTransfer {
  payee: string;
  amount: number;
  memo?: string;
}

/**
 * Flags an unusually large absolute transfer. Without a behavioral baseline an
 * absolute threshold is the only size signal available, so it is weighted as a
 * supporting clue rather than a decisive one.
 */
function detect_high_absolute_amount(transfer: ColdTransfer): RiskSignal | null {
  if (transfer.amount >= high_absolute_amount) {
    return {
      layer: "rules",
      code: "HIGH_ABSOLUTE_AMOUNT",
      weight: high_absolute_weight,
      detail: `Large transfer of ${transfer.amount}.`,
    };
  }
  return null;
}

/**
 * Flags round-number cash-out amounts, which correlate with mule extraction
 * rather than organic spending.
 */
function detect_round_amount(transfer: ColdTransfer): RiskSignal | null {
  if (transfer.amount >= round_amount_min && transfer.amount % round_amount_modulus === 0) {
    return {
      layer: "rules",
      code: "ROUND_CASHOUT",
      weight: round_amount_weight,
      detail: `Round-number transfer of ${transfer.amount}.`,
    };
  }
  return null;
}

/**
 * Flags scam-script vocabulary in the payee or memo, the dominant tell of an
 * authorized-push-payment scam where the victim authorizes the transfer.
 */
function detect_scam_keyword(transfer: ColdTransfer): RiskSignal | null {
  const haystack = `${transfer.payee} ${transfer.memo ?? ""}`.toLowerCase();
  const matched = scam_keywords.find((keyword) => haystack.includes(keyword));
  if (matched) {
    return {
      layer: "rules",
      code: "SCAM_KEYWORD",
      weight: scam_keyword_weight,
      detail: `Transfer context contains scam-pattern language ("${matched}").`,
    };
  }
  return null;
}

/**
 * Runs the history-free scam heuristics over a single transfer.
 *
 * These rules deliberately depend only on the transfer itself, never on a
 * baseline, so they are valid in the cold context a browser extension operates
 * in. They are the deterministic floor beneath the AI adjudicator.
 *
 * @param transfer The single transfer observed on the bank page.
 * @returns Zero or more explainable, history-free signals.
 */
export function score_cold_rules(transfer: ColdTransfer): RiskSignal[] {
  const candidates = [
    detect_high_absolute_amount(transfer),
    detect_round_amount(transfer),
    detect_scam_keyword(transfer),
  ];
  return candidates.filter((signal): signal is RiskSignal => signal !== null);
}
