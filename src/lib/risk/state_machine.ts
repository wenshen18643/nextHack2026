import type { FirewallState } from "./types";

const inspect_threshold = 30;
const quarantine_threshold = 55;
const deny_threshold = 80;
const min_score = 0;
const max_score = 100;

/**
 * Clamps an arbitrary numeric score into the canonical [0, 100] risk domain so
 * that fusion overflow or rounding can never produce an out-of-range state.
 *
 * @param score Raw fused score.
 * @returns The score bounded to [0, 100].
 */
export function clamp_risk_score(score: number): number {
  return Math.min(max_score, Math.max(min_score, score));
}

/**
 * Maps a bounded risk score to a graduated firewall state. Thresholds are
 * intentionally separated so each escalation step applies proportional
 * friction rather than a binary allow/deny.
 *
 * @param score A risk score; values outside [0, 100] are clamped first.
 * @returns The firewall state the transaction should enter.
 */
export function derive_firewall_state(score: number): FirewallState {
  const bounded = clamp_risk_score(score);
  if (bounded >= deny_threshold) {
    return "DENY";
  }
  if (bounded >= quarantine_threshold) {
    return "QUARANTINE";
  }
  if (bounded >= inspect_threshold) {
    return "INSPECT";
  }
  return "PASS";
}

/**
 * Reports whether a score sits in the ambiguous mid-band where deterministic
 * layers are inconclusive and the AI adjudicator adds the most value.
 *
 * @param score A risk score; values outside [0, 100] are clamped first.
 * @returns True when the score warrants AI adjudication.
 */
export function is_ambiguous_midband(score: number): boolean {
  const bounded = clamp_risk_score(score);
  return bounded >= inspect_threshold && bounded < deny_threshold;
}
