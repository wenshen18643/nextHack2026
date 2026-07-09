import type { FirewallState, RiskSignal } from "@/lib/risk/types";
import { apply_ai_adjudication, fuse_risk_score, summarize_reason } from "@/lib/risk/fusion";
import { derive_firewall_state } from "@/lib/risk/state_machine";
import {
  ai_adjudicate_transfer,
  type AiScreenVerdict,
  type SpecialistFinding,
} from "@/lib/screen/ai_screener";
import { insert_flagged_account, insert_transfer_record } from "@/lib/db/supabase_client";
import { log_event, summarize_signals } from "@/lib/observability/logging";
import { run_risk_agent } from "./risk_agent";
import {
  fetch_behaviour_stats,
  normalize_payee_key,
  run_behaviour_agent,
} from "./behaviour_agent";
import { run_anomaly_agent } from "./anomaly_agent";
import { ai_orchestrate_briefings, type OrchestratorBriefings } from "./ai_specialist";
import { format_malaysia_time } from "@/lib/screen/malaysia_time";
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
 * @property orchestration The orchestrator agent's per-specialist briefings,
 *                         when it produced a plan; surfaced for explainability.
 */
export interface MainAgentResult {
  advice: ScreenAdvice;
  score: number;
  state: FirewallState;
  reason: string;
  signals: RiskSignal[];
  agents: AgentReport[];
  ai_used: boolean;
  orchestration?: OrchestratorBriefings;
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

const new_payee_blocklist_floor = 30;

/**
 * Decides whether an AI request to blocklist the recipient should be honored.
 *
 * Requires a block verdict with an explicit flag, so a mild verdict can never
 * blocklist anyone. For a first-seen recipient there is one extra guard: the
 * score with the NEW_PAYEE contribution stripped out must still clear the
 * warn band on its own. This stops the feedback loop where an account gets
 * permanently blocklisted merely for being new plus circumstantial timing,
 * with no independent risk evidence.
 *
 * @param ai_verdict The AI adjudication, if one was obtained.
 * @param signals    The deterministic specialist signals behind the score.
 * @param score      The final fused risk score.
 * @returns True when the blocklist insert should proceed.
 */
export function should_honor_account_flag(
  ai_verdict: AiScreenVerdict | null,
  signals: RiskSignal[],
  score: number,
): boolean {
  if (!ai_verdict?.flag_account || ai_verdict.advice !== "block") {
    return false;
  }
  const new_payee_signal = signals.find((signal) => signal.code === "NEW_PAYEE");
  if (new_payee_signal && score - new_payee_signal.weight <= new_payee_blocklist_floor) {
    return false;
  }
  return true;
}

/**
 * Adds the recipient to the shared scam-account blocklist when
 * `should_honor_account_flag` approves the AI's request. The insert is
 * duplicate-safe so an existing (often manual) entry is never overwritten.
 */
async function blocklist_account_when_ai_requests(
  context: TransferContext,
  ai_verdict: AiScreenVerdict | null,
  signals: RiskSignal[],
  score: number,
): Promise<void> {
  if (!ai_verdict) {
    return;
  }
  if (!should_honor_account_flag(ai_verdict, signals, score)) {
    if (ai_verdict.flag_account) {
      log_event("main-agent", "AI asked to blocklist but the guard declined", {
        payee: context.payee,
        score,
        advice: ai_verdict.advice,
      });
    }
    return;
  }
  log_event("main-agent", "AI flagged recipient for the blocklist", {
    payee: context.payee,
    reason: ai_verdict.reason,
  });
  await insert_flagged_account({
    payee_key: normalize_payee_key(context.payee),
    payee: context.payee,
    reason: ai_verdict.reason,
    source: "ai",
  });
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
    user_id: context.sender_user_id ?? null,
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

  const observed_at_myt = format_malaysia_time(context.observed_at) ?? undefined;
  const [behaviour_stats, briefings] = await Promise.all([
    fetch_behaviour_stats(context),
    ai_orchestrate_briefings({
      payee: context.payee,
      amount: context.amount,
      currency: context.currency,
      memo: context.memo,
      observed_at_myt,
    }),
  ]);
  if (briefings) {
    log_event("main-agent", "orchestrator briefed the specialists", briefings);
  }

  const enriched_context: TransferContext = {
    ...context,
    observed_at_myt,
    prior_flag_count: behaviour_stats?.prior_flag_count ?? 0,
    payee_transfer_count: behaviour_stats?.payee_count,
    payee_avg_amount: behaviour_stats?.payee_avg_amount,
  };

  const [risk_report, behaviour_report, anomaly_report] = await Promise.all([
    run_risk_agent(enriched_context, briefings?.risk),
    run_behaviour_agent(enriched_context, behaviour_stats, briefings?.behaviour),
    run_anomaly_agent(enriched_context, briefings?.anomaly),
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

  await Promise.all([
    log_screened_transfer(context, advice, score, state),
    blocklist_account_when_ai_requests(context, ai_verdict, deterministic_signals, score),
  ]);

  return {
    advice,
    score,
    state,
    reason,
    signals,
    agents,
    ai_used: ai_signal !== null,
    orchestration: briefings ?? undefined,
  };
}
