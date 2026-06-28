import type { RiskSignal } from "@/lib/risk/types";
import { call_supabase_rpc } from "@/lib/db/supabase_client";
import { log_event, summarize_signals } from "@/lib/observability/logging";
import type { AgentReport, TransferContext } from "./types";

const new_payee_weight = 18;
const payee_spike_multiple = 3;
const payee_spike_weight = 20;
const repeat_flagged_payee_weight = 25;

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
  return {
    payee_count: Number(raw.payee_count),
    payee_avg_amount: Number(raw.payee_avg_amount),
    prior_flag_count: Number(raw.prior_flag_count),
  };
}

/**
 * Behaviour agent: the per-recipient-history specialist.
 *
 * Scores the current transfer against this recipient's prior-transfer stats,
 * including any earlier flags against the same recipient. Fail-safe: when
 * history is unavailable it contributes no signals so the screen still completes
 * on the other agents.
 *
 * @param context The observed transfer.
 * @param stats   Pre-fetched statistics; omit to have the agent read them. Pass
 *                null explicitly to signal that history was unavailable.
 * @returns The agent report carrying any behavioral signals.
 */
export async function run_behaviour_agent(
  context: TransferContext,
  stats?: BehaviourStats | null,
): Promise<AgentReport> {
  const resolved = stats === undefined ? await fetch_behaviour_stats(context) : stats;
  if (!resolved) {
    log_event("behaviour-agent", "no history available — contributing no signals", {
      payee_key: normalize_payee_key(context.payee),
    });
    return { agent: "behaviour", signals: [] };
  }

  const signals = score_behaviour(context, resolved);
  log_event("behaviour-agent", "scored recipient history", {
    payee_key: normalize_payee_key(context.payee),
    payee_count: resolved.payee_count,
    payee_avg_amount: Math.round(resolved.payee_avg_amount),
    prior_flag_count: resolved.prior_flag_count,
    signals: summarize_signals(signals),
  });
  return { agent: "behaviour", signals };
}
