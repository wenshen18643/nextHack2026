import type {
  BehaviorProfile,
  RiskAssessment,
  RiskSignal,
  Transaction,
} from "./types";
import { score_behavioral_baseline } from "./layer1_behavioral";
import { score_scam_rules } from "./layer2_rules";
import { fuse_risk_score, summarize_reason } from "./fusion";
import { derive_firewall_state, is_ambiguous_midband } from "./state_machine";

/**
 * Pluggable AI adjudicator. Receives the transaction plus the deterministic
 * signals and returns one refining signal, or null to abstain. Injecting this
 * keeps the engine deterministic and unit-testable without a live LLM.
 */
export type AiAdjudicator = (
  transaction: Transaction,
  deterministic_signals: RiskSignal[],
) => Promise<RiskSignal | null>;

/**
 * Inputs required to evaluate a single transfer through the firewall.
 *
 * @property force_ai When true, the AI adjudicator is consulted regardless of
 *   the deterministic score, overriding the mid-band gate. Intended for demos
 *   and audits, not steady-state production where gating bounds cost.
 */
export interface EvaluationContext {
  transaction: Transaction;
  profile: BehaviorProfile;
  recent_transactions: Transaction[];
  adjudicator?: AiAdjudicator;
  force_ai?: boolean;
}

/**
 * Runs a transaction through the full layered risk firewall and returns a
 * fully-explainable verdict.
 *
 * The deterministic layers (behavioral + rules) always run. The AI adjudicator
 * is invoked only when the deterministic score lands in the ambiguous mid-band,
 * which bounds latency and cost while ensuring the AI never decides alone.
 *
 * @param context The transaction, baseline, history, and optional adjudicator.
 * @returns The fused score, firewall state, reason, and contributing signals.
 */
export async function evaluate_transaction(
  context: EvaluationContext,
): Promise<RiskAssessment> {
  const { transaction, profile, recent_transactions, adjudicator, force_ai } = context;

  const deterministic_signals = [
    ...score_behavioral_baseline(transaction, profile),
    ...score_scam_rules(transaction, recent_transactions, profile),
  ];

  const deterministic_score = fuse_risk_score(deterministic_signals);

  let signals = deterministic_signals;
  let ai_consulted = false;
  let ai_used = false;

  const should_adjudicate =
    adjudicator !== undefined && (force_ai === true || is_ambiguous_midband(deterministic_score));

  if (adjudicator && should_adjudicate) {
    ai_consulted = true;
    const ai_signal = await adjudicator(transaction, deterministic_signals);
    if (ai_signal) {
      signals = [...deterministic_signals, ai_signal];
      ai_used = true;
    }
  }

  const score = fuse_risk_score(signals);

  return {
    score,
    state: derive_firewall_state(score),
    reason: summarize_reason(signals),
    signals,
    ai_consulted,
    ai_used,
  };
}
