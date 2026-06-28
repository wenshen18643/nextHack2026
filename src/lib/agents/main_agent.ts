import type { FirewallState, RiskSignal } from "@/lib/risk/types";
import { fuse_risk_score, summarize_reason } from "@/lib/risk/fusion";
import { derive_firewall_state } from "@/lib/risk/state_machine";
import { ai_screen_transfer } from "@/lib/screen/ai_screener";
import { insert_transfer_record } from "@/lib/db/supabase_client";
import { log_event, summarize_signals } from "@/lib/observability/logging";
import { run_risk_agent } from "./risk_agent";
import {
  fetch_behaviour_stats,
  normalize_payee_key,
  run_behaviour_agent,
} from "./behaviour_agent";
import { run_anomaly_agent } from "./anomaly_agent";
import type { AgentReport, TransferContext } from "./types";

/**
 * Plain-English advice the extension renders to the user before they send.
 */
export type ScreenAdvice = "allow" | "warn" | "block";

/**
 * The fused verdict the main agent returns for one transfer.
 *
 * @property advice  What the user should do: allow, warn, or block.
 * @property score   Fused risk score in [0, 100].
 * @property state   The firewall state the score maps to.
 * @property reason  One-line explanation shown to the user.
 * @property signals Every signal that contributed, across all agents.
 * @property agents  Per-agent signal breakdown for explainability.
 * @property ai_used Whether the AI specialist contributed a signal.
 */
export interface MainAgentResult {
  advice: ScreenAdvice;
  score: number;
  state: FirewallState;
  reason: string;
  signals: RiskSignal[];
  agents: AgentReport[];
  ai_used: boolean;
}

/**
 * Maps a firewall state to the user-facing advice. Only the most restrictive
 * state blocks; the inspection band warns; a clean pass allows.
 */
function derive_advice_from_state(state: FirewallState): ScreenAdvice {
  if (state === "DENY") {
    return "block";
  }
  if (state === "PASS") {
    return "allow";
  }
  return "warn";
}

/**
 * Records the screened transfer so subsequent behaviour and anomaly lookups can
 * learn from it. Awaited but best-effort: failures are swallowed downstream.
 */
async function log_screened_transfer(
  context: TransferContext,
  advice: ScreenAdvice,
  score: number,
  state: FirewallState,
): Promise<void> {
  await insert_transfer_record({
    payee: context.payee,
    payee_key: normalize_payee_key(context.payee),
    amount: context.amount,
    memo: context.memo ?? null,
    currency: context.currency,
    channel: context.channel,
    advice,
    score,
    state,
  });
}

/**
 * Main agent: orchestrates the specialist agents and decides the outcome.
 *
 * Fans out to the risk, behaviour, and anomaly agents and the AI specialist in
 * parallel, collects their signals, fuses them into a single score (the AI layer
 * is weighted slightly higher so it can tip borderline cases without solely
 * deciding them), maps that score to a firewall state, and derives the advice.
 * The transfer is then logged so the history-driven agents improve over time.
 *
 * @param context The complete observed transfer.
 * @returns The fused advice, score, state, reason, and per-agent breakdown.
 */
export async function run_main_agent(context: TransferContext): Promise<MainAgentResult> {
  log_event("main-agent", "screening transfer", {
    payee: context.payee,
    amount: context.amount,
    currency: context.currency,
    memo: context.memo ?? "",
  });

  const behaviour_stats = await fetch_behaviour_stats(context);
  const enriched_context: TransferContext = {
    ...context,
    prior_flag_count: behaviour_stats?.prior_flag_count ?? 0,
  };

  const [risk_report, behaviour_report, anomaly_report, ai_verdict] = await Promise.all([
    run_risk_agent(enriched_context),
    run_behaviour_agent(enriched_context, behaviour_stats),
    run_anomaly_agent(enriched_context),
    ai_screen_transfer(enriched_context),
  ]);

  const ai_signal: RiskSignal | null = ai_verdict
    ? {
        layer: "ai",
        code: "AI_HOLISTIC",
        weight: ai_verdict.risk_score,
        detail: ai_verdict.reason,
      }
    : null;

  log_event("main-agent", "agents reported", {
    risk: summarize_signals(risk_report.signals),
    behaviour: summarize_signals(behaviour_report.signals),
    anomaly: summarize_signals(anomaly_report.signals),
    ai: ai_signal ? `AI_HOLISTIC(${ai_signal.weight})` : "unavailable",
  });

  const agents = [risk_report, behaviour_report, anomaly_report];
  const signals = [
    ...risk_report.signals,
    ...behaviour_report.signals,
    ...anomaly_report.signals,
    ...(ai_signal ? [ai_signal] : []),
  ];

  const score = fuse_risk_score(signals);
  const state = derive_firewall_state(score);
  const advice = derive_advice_from_state(state);
  const reason = ai_verdict?.reason ?? summarize_reason(signals);

  log_event("main-agent", "verdict", {
    score,
    state,
    advice,
    ai_used: ai_signal !== null,
    reason,
  });

  await log_screened_transfer(context, advice, score, state);

  return {
    advice,
    score,
    state,
    reason,
    signals,
    agents,
    ai_used: ai_signal !== null,
  };
}
