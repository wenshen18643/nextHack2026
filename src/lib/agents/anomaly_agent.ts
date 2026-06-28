import type { RiskSignal } from "@/lib/risk/types";
import { call_supabase_rpc } from "@/lib/db/supabase_client";
import type { AgentReport, TransferContext } from "./types";

const outlier_sigma = 2;
const outlier_weight = 16;
const velocity_window_minutes = 10;
const velocity_threshold = 5;
const velocity_weight = 14;

/**
 * Population statistics returned by the `get_anomaly_stats` Postgres function.
 *
 * @property population_mean   Mean amount across all recorded transfers.
 * @property population_stddev Population standard deviation of those amounts.
 * @property recent_count      Transfers recorded within the velocity window.
 */
export interface AnomalyStats {
  population_mean: number;
  population_stddev: number;
  recent_count: number;
}

/**
 * Scores a transfer against the recorded population, independent of recipient.
 *
 * Flags two distinct anomalies: an amount that is a statistical outlier versus
 * the whole population, and a burst of transfers in a short window that may
 * indicate automated draining. Both are population-level signals the
 * recipient-scoped behaviour agent cannot see.
 *
 * @param context The observed transfer.
 * @param stats   The current population statistics.
 * @returns Zero or more behavioral signals.
 */
export function score_anomaly(
  context: TransferContext,
  stats: AnomalyStats,
): RiskSignal[] {
  const signals: RiskSignal[] = [];

  const outlier_ceiling = stats.population_mean + outlier_sigma * stats.population_stddev;
  if (stats.population_stddev > 0 && context.amount > outlier_ceiling) {
    signals.push({
      layer: "behavioral",
      code: "POPULATION_OUTLIER",
      weight: outlier_weight,
      detail: "Amount is a statistical outlier versus recent transfers.",
    });
  }

  if (stats.recent_count >= velocity_threshold) {
    signals.push({
      layer: "behavioral",
      code: "HIGH_VELOCITY",
      weight: velocity_weight,
      detail: `${stats.recent_count} transfers seen in the last ${velocity_window_minutes} minutes.`,
    });
  }

  return signals;
}

/**
 * Anomaly agent: the population-outlier specialist.
 *
 * Reads aggregate statistics across all recorded transfers from Supabase and
 * flags this transfer when it deviates sharply from them. Fail-safe: when stats
 * are unavailable it contributes no signals.
 *
 * @param context The observed transfer.
 * @returns The agent report carrying any anomaly signals.
 */
export async function run_anomaly_agent(context: TransferContext): Promise<AgentReport> {
  const rows = await call_supabase_rpc<AnomalyStats[]>("get_anomaly_stats", {
    p_window_minutes: velocity_window_minutes,
  });
  const raw = rows?.[0];
  if (!raw) {
    return { agent: "anomaly", signals: [] };
  }

  const stats: AnomalyStats = {
    population_mean: Number(raw.population_mean),
    population_stddev: Number(raw.population_stddev),
    recent_count: Number(raw.recent_count),
  };
  return { agent: "anomaly", signals: score_anomaly(context, stats) };
}
