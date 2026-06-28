import type { RiskSignal } from "@/lib/risk/types";

/**
 * Stable identifiers for the specialist agents the main agent fans out to.
 */
export type AgentName = "risk" | "behaviour" | "anomaly";

/**
 * The complete, provider-neutral picture of a single transfer shared by every
 * agent. Identical in shape to the AI screener's context so it can be passed
 * straight through without re-mapping.
 *
 * @property payee       Recipient name or account shown on the page.
 * @property amount      Transfer amount in the account currency.
 * @property currency    ISO-like currency code, defaulted upstream.
 * @property memo        Optional reference/description the user typed.
 * @property channel     Where the transfer was observed (e.g. browser_extension).
 * @property observed_at ISO timestamp when the transfer was intercepted.
 */
export interface TransferContext {
  payee: string;
  amount: number;
  currency: string;
  memo?: string;
  channel: string;
  observed_at: string;
}

/**
 * The output of one specialist agent: the signals it independently observed.
 *
 * @property agent   Which specialist produced the report.
 * @property signals Zero or more explainable risk signals to be fused.
 */
export interface AgentReport {
  agent: AgentName;
  signals: RiskSignal[];
}
