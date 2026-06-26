import type { BehaviorProfile, RiskSignal, Transaction } from "./types";

const amount_zscore_threshold = 2;
const amount_deviation_max_weight = 35;
const amount_weight_per_sigma = 7;
const new_payee_weight = 18;
const new_device_weight = 20;
const off_hours_weight = 12;

/**
 * Computes how many standard deviations a transfer amount sits above the
 * user's mean. Returns 0 when the profile has no spread to compare against,
 * which prevents division-by-zero from manufacturing false anomalies.
 *
 * @param amount  The transfer amount under evaluation.
 * @param profile The user's rolling behavioral baseline.
 * @returns A non-negative z-score; 0 when amount is at or below the mean.
 */
function compute_amount_zscore(amount: number, profile: BehaviorProfile): number {
  if (profile.stddev_amount <= 0) {
    return 0;
  }
  const deviation = (amount - profile.avg_amount) / profile.stddev_amount;
  return Math.max(0, deviation);
}

/**
 * Evaluates a transaction against the user's own behavioral baseline.
 *
 * This layer is purely deterministic and runs in constant time per check, so
 * it can gate every transfer without latency or AI cost. It emits one signal
 * per detected deviation; an empty result means the transfer looks normal.
 *
 * @param transaction The validated transfer to score.
 * @param profile     The user's rolling behavioral baseline.
 * @returns Zero or more explainable behavioral signals.
 */
export function score_behavioral_baseline(
  transaction: Transaction,
  profile: BehaviorProfile,
): RiskSignal[] {
  const signals: RiskSignal[] = [];

  const zscore = compute_amount_zscore(transaction.amount, profile);
  if (zscore >= amount_zscore_threshold) {
    const weight = Math.min(amount_deviation_max_weight, zscore * amount_weight_per_sigma);
    signals.push({
      layer: "behavioral",
      code: "AMOUNT_DEVIATION",
      weight,
      detail: `Amount is ${zscore.toFixed(1)}σ above this user's typical transfer.`,
    });
  }

  if (!profile.common_payees.includes(transaction.payee)) {
    signals.push({
      layer: "behavioral",
      code: "FIRST_TIME_PAYEE",
      weight: new_payee_weight,
      detail: "Payee has never received a transfer from this user before.",
    });
  }

  if (!profile.known_devices.includes(transaction.device)) {
    signals.push({
      layer: "behavioral",
      code: "UNRECOGNIZED_DEVICE",
      weight: new_device_weight,
      detail: "Transfer initiated from a device not previously seen for this user.",
    });
  }

  const transfer_hour = new Date(transaction.created_at).getUTCHours();
  if (profile.active_hours.length > 0 && !profile.active_hours.includes(transfer_hour)) {
    signals.push({
      layer: "behavioral",
      code: "OFF_HOURS_ACTIVITY",
      weight: off_hours_weight,
      detail: `Transfer at ${transfer_hour}:00 UTC falls outside the user's active hours.`,
    });
  }

  return signals;
}
