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
 * @property channel          Where the transfer was observed (e.g. browser_extension).
 * @property observed_at      ISO timestamp when the transfer was intercepted.
 * @property prior_flag_count How many earlier transfers to this same recipient
 *                            were flagged (advice 'warn' or 'block'). Enriched
 *                            from history before fan-out so every agent and the
 *                            AI adjudicator can weight a repeat offender.
 * @property sender_name         Signed-in sender's display name, when known.
 * @property sender_user_id      Signed-in sender's Supabase auth user id, used
 *                               to associate the logged transfer with them.
 * @property sender_age          Signed-in sender's approximate age in years,
 *                               derived from the profile birth year. Powers
 *                               age-aware weighting; never cited to the user.
 * @property payee_transfer_count How many prior transfers went to this
 *                                recipient, enriched from history.
 * @property payee_avg_amount     Mean amount previously sent to this recipient,
 *                                enriched from history.
 */
export interface TransferContext {
  payee: string;
  amount: number;
  currency: string;
  memo?: string;
  channel: string;
  observed_at: string;
  prior_flag_count?: number;
  sender_name?: string;
  sender_user_id?: string;
  sender_age?: number;
  payee_transfer_count?: number;
  payee_avg_amount?: number;
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
