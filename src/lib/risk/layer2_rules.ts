import type { BehaviorProfile, RiskSignal, Transaction } from "./types";

const velocity_window_minutes = 10;
const velocity_count_threshold = 4;
const velocity_weight = 30;
const dormancy_days_threshold = 30;
const dormancy_drain_ratio = 0.8;
const dormancy_weight = 28;
const round_amount_modulus = 1000;
const round_amount_min = 1000;
const round_amount_weight = 10;
const new_payee_large_multiplier = 3;
const new_payee_large_weight = 25;

const minutes_to_ms = 60 * 1000;
const days_to_ms = 24 * 60 * minutes_to_ms;

/**
 * Detects a burst of transfers within a short window, the hallmark of an
 * account being rapidly drained after takeover.
 */
function detect_velocity_spike(
  transaction: Transaction,
  recent_transactions: Transaction[],
): RiskSignal | null {
  const window_start = new Date(transaction.created_at).getTime() - velocity_window_minutes * minutes_to_ms;
  const recent_count = recent_transactions.filter(
    (candidate) => new Date(candidate.created_at).getTime() >= window_start,
  ).length;

  if (recent_count >= velocity_count_threshold) {
    return {
      layer: "rules",
      code: "VELOCITY_SPIKE",
      weight: velocity_weight,
      detail: `${recent_count} transfers in the last ${velocity_window_minutes} minutes.`,
    };
  }
  return null;
}

/**
 * Detects a large outflow shortly after a long period of inactivity, a common
 * pattern when a previously dormant account is compromised or used as a mule.
 */
function detect_post_dormancy_drain(
  transaction: Transaction,
  recent_transactions: Transaction[],
  profile: BehaviorProfile,
): RiskSignal | null {
  if (recent_transactions.length === 0) {
    return null;
  }
  const last_activity = Math.max(
    ...recent_transactions.map((candidate) => new Date(candidate.created_at).getTime()),
  );
  const idle_ms = new Date(transaction.created_at).getTime() - last_activity;
  const drains_balance = transaction.amount >= profile.avg_amount * (1 / dormancy_drain_ratio);

  if (idle_ms >= dormancy_days_threshold * days_to_ms && drains_balance) {
    return {
      layer: "rules",
      code: "POST_DORMANCY_DRAIN",
      weight: dormancy_weight,
      detail: "Large transfer immediately after a long dormant period.",
    };
  }
  return null;
}

/**
 * Flags suspiciously round cash-out amounts, which correlate with mule
 * cash-extraction chains rather than organic spending.
 */
function detect_round_amount(transaction: Transaction): RiskSignal | null {
  if (transaction.amount >= round_amount_min && transaction.amount % round_amount_modulus === 0) {
    return {
      layer: "rules",
      code: "ROUND_CASHOUT",
      weight: round_amount_weight,
      detail: `Round-number transfer of ${transaction.amount}.`,
    };
  }
  return null;
}

/**
 * Flags a large transfer to a never-before-seen payee, the dominant pattern in
 * authorized-push-payment scams.
 */
function detect_large_new_payee(
  transaction: Transaction,
  profile: BehaviorProfile,
): RiskSignal | null {
  const is_new_payee = !profile.common_payees.includes(transaction.payee);
  const is_large = transaction.amount >= profile.avg_amount * new_payee_large_multiplier;
  if (is_new_payee && is_large) {
    return {
      layer: "rules",
      code: "LARGE_NEW_PAYEE",
      weight: new_payee_large_weight,
      detail: "Unusually large transfer to a brand-new payee.",
    };
  }
  return null;
}

/**
 * Runs the deterministic scam-signature rule set over a transaction.
 *
 * Every rule is auditable and weight-tagged so the resulting decision can be
 * explained signal-by-signal. Rules requiring history degrade gracefully when
 * `recent_transactions` is empty.
 *
 * @param transaction         The validated transfer to score.
 * @param recent_transactions The user's recent transfers, newest or oldest order agnostic.
 * @param profile             The user's rolling behavioral baseline.
 * @returns Zero or more explainable rule signals.
 */
export function score_scam_rules(
  transaction: Transaction,
  recent_transactions: Transaction[],
  profile: BehaviorProfile,
): RiskSignal[] {
  const candidate_signals = [
    detect_velocity_spike(transaction, recent_transactions),
    detect_post_dormancy_drain(transaction, recent_transactions, profile),
    detect_round_amount(transaction),
    detect_large_new_payee(transaction, profile),
  ];

  return candidate_signals.filter((signal): signal is RiskSignal => signal !== null);
}
