import type { RiskSignal } from "@/lib/risk/types";
import { fuse_risk_score, summarize_reason } from "@/lib/risk/fusion";
import { derive_firewall_state } from "@/lib/risk/state_machine";
import { score_cold_rules, type ColdTransfer } from "./cold_rules";
import { ai_screen_transfer, type ScreenContext } from "./ai_screener";

const inspect_threshold = 30;
const default_currency = "MYR";
const extension_channel = "browser_extension";

/**
 * Plain-English advice the extension renders to the user before they send.
 */
export type ScreenAdvice = "allow" | "warn" | "block";

/**
 * The verdict returned to the browser extension for one observed transfer.
 *
 * @property advice   What the user should do: allow, warn, or block.
 * @property score    Risk score in [0, 100].
 * @property reason   One-line plain-language explanation to show the user.
 * @property signals  Fallback signals, populated only when the AI was unreachable.
 * @property ai_used  Whether the AI produced the verdict (true) or the fallback did.
 */
export interface ScreenResult {
  advice: ScreenAdvice;
  score: number;
  reason: string;
  signals: RiskSignal[];
  ai_used: boolean;
}

/**
 * Maps a fallback score to advice. Used only when the AI is unavailable; the AI
 * path returns its own advice directly.
 */
function derive_advice(score: number): ScreenAdvice {
  const state = derive_firewall_state(score);
  if (state === "DENY") {
    return "block";
  }
  if (score >= inspect_threshold) {
    return "warn";
  }
  return "allow";
}

/**
 * Assembles the complete context handed to the AI from the page-observed fields.
 */
function build_context(transfer: ColdTransfer): ScreenContext {
  return {
    payee: transfer.payee,
    amount: transfer.amount,
    currency: default_currency,
    memo: transfer.memo,
    channel: extension_channel,
    observed_at: new Date().toISOString(),
  };
}

/**
 * Deterministic fallback used only when the AI cannot be consulted, so a dead
 * key or network failure never silently allows every transfer.
 */
function screen_with_fallback_rules(transfer: ColdTransfer): ScreenResult {
  const signals = score_cold_rules(transfer);
  const score = fuse_risk_score(signals);
  return {
    advice: derive_advice(score),
    score,
    reason: summarize_reason(signals),
    signals,
    ai_used: false,
  };
}

/**
 * Screens a single transfer, AI-first.
 *
 * The AI receives the entire transfer context and returns the verdict. The
 * deterministic rules run only when the AI is unreachable, acting purely as a
 * safety net rather than as a parallel decision-maker. This is the entry point
 * behind `POST /api/screen`.
 *
 * @param transfer The payee, amount, and optional memo seen on the bank page.
 * @returns The advice, score, reason, and (only on fallback) signals.
 */
export async function screen_transfer(transfer: ColdTransfer): Promise<ScreenResult> {
  const verdict = await ai_screen_transfer(build_context(transfer));
  if (verdict) {
    return {
      advice: verdict.advice,
      score: verdict.risk_score,
      reason: verdict.reason,
      signals: [],
      ai_used: true,
    };
  }
  return screen_with_fallback_rules(transfer);
}
