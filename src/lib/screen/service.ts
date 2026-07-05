import { run_main_agent, type MainAgentResult } from "@/lib/agents/main_agent";
import type { TransferContext } from "@/lib/agents/types";
import type { ColdTransfer } from "./cold_rules";

const default_currency = "MYR";
const extension_channel = "browser_extension";

/**
 * The verdict returned to the browser extension for one observed transfer. The
 * multi-agent result is the public contract behind `POST /api/screen`.
 */
export type ScreenResult = MainAgentResult;

/**
 * The signed-in sender's identity, resolved from the session and profile by
 * the API route. Optional throughout: screening works identically when the
 * sender is anonymous, just without age-aware weighting.
 *
 * @property name The sender's display name.
 * @property age  The sender's approximate age in years.
 */
export interface SenderContext {
  name?: string;
  age?: number;
}

/**
 * Assembles the full transfer context handed to the agents from the fields a
 * bank page exposes plus any resolved sender identity, filling the
 * server-known defaults.
 */
function build_context(transfer: ColdTransfer, sender?: SenderContext): TransferContext {
  return {
    payee: transfer.payee,
    amount: transfer.amount,
    currency: default_currency,
    memo: transfer.memo,
    channel: extension_channel,
    observed_at: new Date().toISOString(),
    sender_name: sender?.name,
    sender_age: sender?.age,
  };
}

/**
 * Screens a single transfer through the multi-agent engine.
 *
 * Delegates to the main agent, which fans out to the risk, behaviour, and
 * anomaly specialists plus the AI adjudicator, fuses their signals, and decides
 * the firewall state. This is the entry point behind `POST /api/screen`.
 *
 * @param transfer The payee, amount, and optional memo seen on the bank page.
 * @param sender   The signed-in sender, when the session resolved one.
 * @returns The fused advice, score, state, reason, and per-agent breakdown.
 */
export async function screen_transfer(
  transfer: ColdTransfer,
  sender?: SenderContext,
): Promise<ScreenResult> {
  return run_main_agent(build_context(transfer, sender));
}
