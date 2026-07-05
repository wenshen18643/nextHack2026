import type { FirewallState, RiskSignal } from "@/lib/risk/types";
import { apply_ai_adjudication, fuse_risk_score, summarize_reason } from "@/lib/risk/fusion";
import { derive_firewall_state } from "@/lib/risk/state_machine";
import {
  ai_adjudicate_transfer,
  type AiScreenVerdict,
  type SpecialistFinding,
} from "@/lib/screen/ai_screener";
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
 * @property ai_used Whether the AI adjudicator contributed to the verdict.
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
 * Flattens the specialist reports into the finding list handed to the AI
 * adjudicator, tagged with the agent that raised each one.
 */
function collect_specialist_findings(reports: AgentReport[]): SpecialistFinding[] {
  return reports.flatMap((report) =>
    report.signals.map((signal) => ({
      agent: report.agent,
      code: signal.code,
      weight: signal.weight,
      detail: signal.detail,
    })),
  );
}

/**
 * Chooses the one-line explanation shown to the user.
 *
 * The AI's reason is used only when its advice agrees with the final advice, so
 * the card can never carry a warning frame with an "appears low risk" body (or
 * the reverse). On disagreement or AI unavailability the explanation comes from
 * the deterministic signals that actually drove the verdict.
 *
 * @param final_advice          The advice derived from the final fused score.
 * @param ai_verdict            The AI adjudication, if one was obtained.
 * @param deterministic_signals The specialist signals behind the score.
 * @returns A single sentence consistent with the final advice.
 */
function choose_user_reason(
  final_advice: ScreenAdvice,
  ai_verdict: AiScreenVerdict | null,
  deterministic_signals: RiskSignal[],
): string {
  if (ai_verdict && ai_verdict.advice === final_advice) {
    return ai_verdict.reason;
  }
  return summarize_reason(deterministic_signals);
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
 * Runs in two phases. Phase one fans out to the deterministic risk, behaviour,
 * and anomaly specialists in parallel and fuses their signals into a
 * deterministic score. Phase two hands the AI adjudicator the complete picture —
 * the raw transfer, every specialist finding, and that score — so it rules on
 * the same evidence rather than guessing blind; its verdict then pulls the score
 * a bounded distance in either direction. The transfer is logged afterwards so
 * the history-driven agents improve over time.
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

  const [risk_report, behaviour_report, anomaly_report] = await Promise.all([
    run_risk_agent(enriched_context),
    run_behaviour_agent(enriched_context, behaviour_stats),
    run_anomaly_agent(enriched_context),
  ]);

  const agents = [risk_report, behaviour_report, anomaly_report];
  const deterministic_signals = agents.flatMap((report) => report.signals);
  const deterministic_score = fuse_risk_score(deterministic_signals);

  log_event("main-agent", "specialists reported", {
    risk: summarize_signals(risk_report.signals),
    behaviour: summarize_signals(behaviour_report.signals),
    anomaly: summarize_signals(anomaly_report.signals),
    deterministic_score,
  });

  const ai_verdict = await ai_adjudicate_transfer({
    transfer: enriched_context,
    specialist_findings: collect_specialist_findings(agents),
    deterministic_score,
  });

  let score = deterministic_score;
  let ai_signal: RiskSignal | null = null;
  if (ai_verdict) {
    const { final_score, ai_adjustment } = apply_ai_adjudication(
      deterministic_score,
      ai_verdict.risk_score,
    );
    score = final_score;
    ai_signal = {
      layer: "ai",
      code: "AI_ADJUDICATION",
      weight: ai_adjustment,
      detail: ai_verdict.reason,
    };
  }

  const state = derive_firewall_state(score);
  const advice = derive_advice_from_state(state);
  const reason = choose_user_reason(advice, ai_verdict, deterministic_signals);
  const signals = [...deterministic_signals, ...(ai_signal ? [ai_signal] : [])];

  log_event("main-agent", "verdict", {
    score,
    state,
    advice,
    ai_used: ai_signal !== null,
    ai_adjustment: ai_signal?.weight ?? 0,
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
