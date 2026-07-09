import type { RiskSignal } from "@/lib/risk/types";
import { get_malaysia_hour } from "./malaysia_time";

const high_absolute_amount = 5000;
const high_absolute_weight = 22;
const round_amount_modulus = 1000;
const round_amount_min = 1000;
const round_amount_weight = 12;
const scam_keyword_weight = 30;
const odd_hour_end_exclusive = 6;
const odd_hour_weight = 10;
const elderly_age_threshold_years = 60;
const elderly_odd_hour_weight = 20;

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
 * @property payee       The recipient name or account as shown on the page.
 * @property amount      The transfer amount in the account currency.
 * @property memo        Optional reference/description the user typed.
 * @property observed_at Optional ISO timestamp of when the transfer was
 *                       intercepted. Stamped by the server at intake, so it is
 *                       absent on the raw extension payload and present when an
 *                       agent re-screens the enriched context.
 * @property sender_age  Optional sender age in years, resolved from the
 *                       signed-in profile. Raises the timing rule's weight for
 *                       the demographics scammers target hardest; the signal
 *                       text stays behavioural and never mentions age.
 */
export interface ColdTransfer {
  payee: string;
  amount: number;
  memo?: string;
  observed_at?: string;
  sender_age?: number;
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
 * Flags transfers initiated in the late-night window (00:00–05:59 Malaysia
 * time, UTC+8), when scam scripts pressure victims to act while support lines
 * are closed and family is asleep. The hour is always resolved in
 * Asia/Kuala_Lumpur so a UTC server cannot misread 1 a.m. in Malaysia as
 * late afternoon. A supporting clue, weighted well below the decisive signals
 * but raised for older senders, whom late-night scam scripts target hardest.
 * The user-facing detail stays behavioural: it describes the timing, never the
 * sender. Silently skipped when the timestamp is absent or invalid.
 */
function detect_odd_hour_transfer(transfer: ColdTransfer): RiskSignal | null {
  const local_hour = get_malaysia_hour(transfer.observed_at);
  if (local_hour === null || local_hour >= odd_hour_end_exclusive) {
    return null;
  }
  const is_elderly_sender =
    transfer.sender_age !== undefined && transfer.sender_age >= elderly_age_threshold_years;
  return {
    layer: "rules",
    code: "ODD_HOUR_TRANSFER",
    weight: is_elderly_sender ? elderly_odd_hour_weight : odd_hour_weight,
    detail: `Transfer initiated around ${String(local_hour).padStart(2, "0")}:00 Malaysia time, inside the late-night high-risk window.`,
  };
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
    detect_odd_hour_transfer(transfer),
  ];
  return candidates.filter((signal): signal is RiskSignal => signal !== null);
}
