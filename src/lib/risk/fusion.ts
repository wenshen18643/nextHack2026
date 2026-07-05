import type { RiskSignal } from "./types";
import { clamp_risk_score } from "./state_machine";

const ai_pull_strength = 0.6;
const max_ai_swing_points = 25;

/**
 * Fuses the deterministic specialist signals into a single bounded risk score.
 *
 * Signal weights are summed directly and clamped into [0, 100] so downstream
 * state mapping is total. The AI adjudicator is intentionally excluded here;
 * its influence is applied afterwards as a bounded adjustment via
 * `apply_ai_adjudication` so it can never be double-counted.
 *
 * @param signals The signals emitted by the deterministic agents.
 * @returns A fused risk score in the closed interval [0, 100].
 */
export function fuse_risk_score(signals: RiskSignal[]): number {
  const raw = signals.reduce((total, signal) => total + signal.weight, 0);
  return clamp_risk_score(raw);
}

/**
 * Pulls the deterministic score toward the AI adjudicator's score, within a
 * hard cap.
 *
 * The AI moves the score `ai_pull_strength` of the way toward its own estimate,
 * bounded to ±`max_ai_swing_points`. That lets the adjudicator tip borderline
 * cases in either direction while guaranteeing it can never single-handedly
 * clear strong deterministic evidence or manufacture a block from nothing.
 *
 * @param deterministic_score The fused specialist score in [0, 100].
 * @param ai_score            The AI adjudicator's holistic score in [0, 100].
 * @returns The final score and the signed adjustment the AI contributed.
 */
export function apply_ai_adjudication(
  deterministic_score: number,
  ai_score: number,
): { final_score: number; ai_adjustment: number } {
  const pull = (clamp_risk_score(ai_score) - deterministic_score) * ai_pull_strength;
  const ai_adjustment = Math.round(
    Math.min(max_ai_swing_points, Math.max(-max_ai_swing_points, pull)),
  );
  return {
    final_score: clamp_risk_score(deterministic_score + ai_adjustment),
    ai_adjustment,
  };
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
