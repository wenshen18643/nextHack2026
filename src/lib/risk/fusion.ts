import type { RiskLayer, RiskSignal } from "./types";
import { clamp_risk_score } from "./state_machine";

const layer_weights: Record<RiskLayer, number> = {
  behavioral: 1,
  rules: 1,
  ai: 1.2,
};

/**
 * Fuses individual signal weights into a single bounded risk score.
 *
 * Signals are summed with a small per-layer multiplier that lets the AI
 * adjudicator nudge borderline cases without ever solely deciding the outcome.
 * The result is clamped into [0, 100] so downstream state mapping is total.
 *
 * @param signals Every signal emitted by the engine layers.
 * @returns A fused risk score in the closed interval [0, 100].
 */
export function fuse_risk_score(signals: RiskSignal[]): number {
  const raw = signals.reduce(
    (total, signal) => total + signal.weight * layer_weights[signal.layer],
    0,
  );
  return clamp_risk_score(raw);
}

/**
 * Builds a concise, human-readable reason from the highest-weight signals.
 *
 * @param signals    Signals that contributed to the score.
 * @param max_reasons Maximum number of signal details to include.
 * @returns A plain-language summary, or a benign message when no signals fired.
 */
export function summarize_reason(signals: RiskSignal[], max_reasons = 3): string {
  if (signals.length === 0) {
    return "No risk signals detected; transfer matches the user's normal behavior.";
  }
  return [...signals]
    .sort((left, right) => right.weight - left.weight)
    .slice(0, max_reasons)
    .map((signal) => signal.detail)
    .join(" ");
}
