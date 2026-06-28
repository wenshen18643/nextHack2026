import { score_cold_rules, type ColdTransfer } from "@/lib/screen/cold_rules";
import { log_event, summarize_signals } from "@/lib/observability/logging";
import type { AgentReport, TransferContext } from "./types";

/**
 * Risk agent: the history-free specialist.
 *
 * Judges the transfer on its own terms — amount thresholds, round-number
 * cash-out patterns, and scam-script vocabulary — with no dependency on stored
 * history. It is therefore always available, even on a cold database, and forms
 * the deterministic floor the other agents build on.
 *
 * @param context The observed transfer.
 * @returns The agent report carrying any history-free rule signals.
 */
export async function run_risk_agent(context: TransferContext): Promise<AgentReport> {
  const transfer: ColdTransfer = {
    payee: context.payee,
    amount: context.amount,
    memo: context.memo,
  };
  const signals = score_cold_rules(transfer);
  log_event("risk-agent", "scored history-free rules", { signals: summarize_signals(signals) });
  return { agent: "risk", signals };
}
