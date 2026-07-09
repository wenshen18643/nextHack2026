import type { RiskSignal } from "@/lib/risk/types";
import {
  call_supabase_rpc,
  fetch_flagged_account,
  type FlaggedAccountRecord,
} from "@/lib/db/supabase_client";
import { log_event, summarize_signals } from "@/lib/observability/logging";
import { ai_specialist_score } from "./ai_specialist";
import { coerce_finite_number } from "./numeric";
import type { AgentReport, TransferContext } from "./types";

const new_payee_weight = 18;
const payee_spike_multiple = 3;
const payee_spike_weight = 20;
const repeat_flagged_payee_weight = 25;
const known_flagged_account_weight = 80;
const behaviour_max_points = 33;

const behaviour_rule_guidance = [
  "A recipient flagged as suspicious on earlier transfers (prior_flag_count above zero) is a strong risk regardless of amount; worth most of your budget, scaling with how many prior flags exist.",
  "An amount far above what the sender usually sends this recipient (several times payee_avg_amount) suggests coached escalation or account takeover; worth a large share, scaling with the multiple.",
  "A known recipient at a typical amount with no prior flags is normal behaviour and deserves zero points.",
];

/**
 * Per-recipient history returned by the `get_behaviour_stats` Postgres function.
 *
 * @property payee_count      How many prior transfers went to this recipient.
 * @property payee_avg_amount The mean amount previously sent to this recipient.
 * @property prior_flag_count How many earlier transfers to this recipient were
 *                            flagged (advice 'warn' or 'block').
 */
export interface BehaviourStats {
  payee_count: number;
  payee_avg_amount: number;
  prior_flag_count: number;
}

/**
 * Normalizes a payee into a stable lookup key so trivial casing or whitespace
 * differences map to the same recipient history.
 *
 * @param payee The raw recipient name as shown on the page.
 * @returns A trimmed, lowercased key.
 */
export function normalize_payee_key(payee: string): string {
  return payee.trim().toLowerCase();
}

/**
 * Scores a transfer against this recipient's history.
 *
 * Pure and history-driven: a recipient flagged on earlier transfers is a strong
 * risk regardless of amount, a never-before-seen recipient is a mild risk, and
 * an amount far above what the user normally sends this recipient is a stronger
 * one. A known, never-flagged recipient at a normal amount contributes nothing.
 *
 * @param context The observed transfer.
 * @param stats   This recipient's prior-transfer statistics.
 * @returns Zero or more behavioral signals.
 */
export function score_behaviour(
  context: TransferContext,
  stats: BehaviourStats,
): RiskSignal[] {
  const signals: RiskSignal[] = [];

  if (stats.prior_flag_count > 0) {
    signals.push({
      layer: "behavioral",
      code: "REPEAT_FLAGGED_PAYEE",
      weight: repeat_flagged_payee_weight,
      detail: `This recipient was flagged as suspicious on ${stats.prior_flag_count} earlier transfer(s).`,
    });
  }

  if (stats.payee_count === 0) {
    signals.push({
      layer: "behavioral",
      code: "NEW_PAYEE",
      weight: new_payee_weight,
      detail: "First recorded transfer to this recipient.",
    });
    return signals;
  }

  if (
    stats.payee_avg_amount > 0 &&
    context.amount > stats.payee_avg_amount * payee_spike_multiple
  ) {
    signals.push({
      layer: "behavioral",
      code: "PAYEE_AMOUNT_SPIKE",
      weight: payee_spike_weight,
      detail: `Amount is far above the usual ${Math.round(stats.payee_avg_amount)} sent to this recipient.`,
    });
  }

  return signals;
}

/**
 * Converts a blocklist hit into the strongest deterministic signal we emit.
 *
 * Weighted so a blocklist hit alone reaches the DENY band, and even the AI's
 * maximum downward pull cannot drop it below the warning band: a known scam
 * account is never washed to "allow".
 *
 * @param flagged The blocklist row for this recipient, or null when absent.
 * @returns The blocklist signal, or null when the recipient is not listed.
 */
export function score_flagged_account(flagged: FlaggedAccountRecord | null): RiskSignal | null {
  if (!flagged) {
    return null;
  }
  return {
    layer: "behavioral",
    code: "KNOWN_FLAGGED_ACCOUNT",
    weight: known_flagged_account_weight,
    detail: `Recipient is on the shared scam-account blocklist (${flagged.source}): ${flagged.reason}`,
  };
}

/**
 * Reads this recipient's prior-transfer statistics from Supabase.
 *
 * Exposed separately so the main agent can fetch once and share the result with
 * both this agent and the AI adjudicator, avoiding a duplicate round-trip.
 * Fail-safe: returns null when history is unavailable.
 *
 * @param context The observed transfer.
 * @returns The recipient's statistics, or null when history cannot be read.
 */
export async function fetch_behaviour_stats(
  context: TransferContext,
): Promise<BehaviourStats | null> {
  const rows = await call_supabase_rpc<BehaviourStats[]>("get_behaviour_stats", {
    p_payee_key: normalize_payee_key(context.payee),
  });
  const raw = rows?.[0];
  if (!raw) {
    return null;
  }
  if (raw.prior_flag_count === undefined) {
    console.warn(
      "[behaviour-agent] get_behaviour_stats returned no prior_flag_count — deployed DB function is stale; re-run docs/supabase_schema.sql.",
    );
  }
  return {
    payee_count: coerce_finite_number(raw.payee_count),
    payee_avg_amount: coerce_finite_number(raw.payee_avg_amount),
    prior_flag_count: coerce_finite_number(raw.prior_flag_count),
  };
}

/**
 * Builds the hard-rule signal for a first-seen recipient. Deliberately never
 * delegated to the AI: newness is a plain fact, and keeping it deterministic
 * lets the blocklist guard reliably discount it.
 */
function build_new_payee_signal(): RiskSignal {
  return {
    layer: "behavioral",
    code: "NEW_PAYEE",
    weight: new_payee_weight,
    detail: "First recorded transfer to this recipient.",
  };
}

/**
 * Scores this recipient's prior-transfer history with the AI, guided by the
 * former hard-coded history rules and capped at this agent's point budget.
 * Falls back to the deterministic history rules when the AI is unreachable.
 */
async function score_history_with_ai(
  context: TransferContext,
  stats: BehaviourStats,
  briefing?: string,
): Promise<RiskSignal[]> {
  const assessment = await ai_specialist_score({
    agent_name: "behaviour",
    domain:
      "You judge only this sender's prior history with this exact recipient — nothing about the transfer's wording, timing, or the wider population.",
    max_points: behaviour_max_points,
    rule_guidance: behaviour_rule_guidance,
    payload: {
      amount: context.amount,
      currency: context.currency,
      payee_transfer_count: stats.payee_count,
      payee_avg_amount: stats.payee_avg_amount,
      prior_flag_count: stats.prior_flag_count,
      orchestrator_briefing: briefing,
    },
  });

  if (!assessment) {
    return score_behaviour(context, stats);
  }
  if (assessment.points === 0) {
    return [];
  }
  return [
    {
      layer: "ai",
      code: "AI_BEHAVIOUR_ASSESSMENT",
      weight: assessment.points,
      detail: assessment.reason,
    },
  ];
}

/**
 * Behaviour agent: the per-recipient specialist.
 *
 * Two hard rules stay deterministic by design: a blocklist hit and a first-seen
 * recipient are plain facts, not judgement calls. Everything else about the
 * recipient's history (prior flags, amount spikes) is judged by the AI within
 * this agent's point budget, guided by the former hard-coded rules, with the
 * deterministic rules as the fallback when the AI is unreachable. Fail-safe:
 * when the blocklist or history is unavailable that part simply contributes no
 * signals so the screen still completes on the rest.
 *
 * @param context  The observed transfer.
 * @param stats    Pre-fetched statistics; omit to have the agent read them.
 *                 Pass null explicitly to signal that history was unavailable.
 * @param briefing Optional targeted instruction from the orchestrator agent.
 * @returns The agent report carrying any behavioral signals.
 */
export async function run_behaviour_agent(
  context: TransferContext,
  stats?: BehaviourStats | null,
  briefing?: string,
): Promise<AgentReport> {
  const payee_key = normalize_payee_key(context.payee);
  const [resolved, flagged] = await Promise.all([
    stats === undefined ? fetch_behaviour_stats(context) : Promise.resolve(stats),
    fetch_flagged_account(payee_key),
  ]);

  const signals: RiskSignal[] = [];
  const blocklist_signal = score_flagged_account(flagged);
  if (blocklist_signal) {
    signals.push(blocklist_signal);
  }
  if (resolved) {
    if (resolved.payee_count === 0) {
      signals.push(build_new_payee_signal());
    } else {
      signals.push(...(await score_history_with_ai(context, resolved, briefing)));
    }
  }

  log_event("behaviour-agent", "scored recipient", {
    payee_key,
    blocklisted: flagged !== null,
    payee_count: resolved?.payee_count ?? "unavailable",
    prior_flag_count: resolved?.prior_flag_count ?? "unavailable",
    signals: summarize_signals(signals),
  });
  return { agent: "behaviour", signals };
}
