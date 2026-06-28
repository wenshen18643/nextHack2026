import type { RiskSignal } from "@/lib/risk/types";
import { call_supabase_rpc } from "@/lib/db/supabase_client";
import { log_event, summarize_signals } from "@/lib/observability/logging";
import type { AgentReport, TransferContext } from "./types";

const new_payee_weight = 18;
const payee_spike_multiple = 3;
const payee_spike_weight = 20;

/**
 * Per-recipient history returned by the `get_behaviour_stats` Postgres function.
 *
 * @property payee_count      How many prior transfers went to this recipient.
 * @property payee_avg_amount The mean amount previously sent to this recipient.
 */
export interface BehaviourStats {
  payee_count: number;
  payee_avg_amount: number;
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
 * Pure and history-driven: a never-before-seen recipient is a mild risk, and an
 * amount far above what the user normally sends this recipient is a stronger
 * one. A known recipient at a normal amount contributes nothing.
 *
 * @param context The observed transfer.
 * @param stats   This recipient's prior-transfer statistics.
 * @returns Zero or more behavioral signals.
 */
export function score_behaviour(
  context: TransferContext,
  stats: BehaviourStats,
): RiskSignal[] {
  if (stats.payee_count === 0) {
    return [
      {
        layer: "behavioral",
        code: "NEW_PAYEE",
        weight: new_payee_weight,
        detail: "First recorded transfer to this recipient.",
      },
    ];
  }

  if (
    stats.payee_avg_amount > 0 &&
    context.amount > stats.payee_avg_amount * payee_spike_multiple
  ) {
    return [
      {
        layer: "behavioral",
        code: "PAYEE_AMOUNT_SPIKE",
        weight: payee_spike_weight,
        detail: `Amount is far above the usual ${Math.round(stats.payee_avg_amount)} sent to this recipient.`,
      },
    ];
  }

  return [];
}

/**
 * Behaviour agent: the per-recipient-history specialist.
 *
 * Reads this recipient's prior-transfer stats from Supabase and scores the
 * current transfer against them. Fail-safe: when history is unavailable it
 * contributes no signals so the screen still completes on the other agents.
 *
 * @param context The observed transfer.
 * @returns The agent report carrying any behavioral signals.
 */
export async function run_behaviour_agent(context: TransferContext): Promise<AgentReport> {
  const rows = await call_supabase_rpc<BehaviourStats[]>("get_behaviour_stats", {
    p_payee_key: normalize_payee_key(context.payee),
  });
  const raw = rows?.[0];
  if (!raw) {
    log_event("behaviour-agent", "no history available — contributing no signals", {
      payee_key: normalize_payee_key(context.payee),
    });
    return { agent: "behaviour", signals: [] };
  }

  const stats: BehaviourStats = {
    payee_count: Number(raw.payee_count),
    payee_avg_amount: Number(raw.payee_avg_amount),
  };
  const signals = score_behaviour(context, stats);
  log_event("behaviour-agent", "scored recipient history", {
    payee_key: normalize_payee_key(context.payee),
    payee_count: stats.payee_count,
    payee_avg_amount: Math.round(stats.payee_avg_amount),
    signals: summarize_signals(signals),
  });
  return { agent: "behaviour", signals };
}
