import { describe, expect, it } from "vitest";
import type { RiskSignal } from "@/lib/risk/types";
import type { AiScreenVerdict } from "@/lib/screen/ai_screener";
import { should_honor_account_flag } from "./main_agent";

const block_and_flag: AiScreenVerdict = {
  risk_score: 85,
  advice: "block",
  reason: "Recipient shows a coordinated mule pattern.",
  flag_account: true,
};

const new_payee_signal: RiskSignal = {
  layer: "behavioral",
  code: "NEW_PAYEE",
  weight: 18,
  detail: "First recorded transfer to this recipient.",
};

const scam_keyword_signal: RiskSignal = {
  layer: "rules",
  code: "SCAM_KEYWORD",
  weight: 30,
  detail: 'Transfer context contains scam-pattern language ("invest").',
};

describe("should_honor_account_flag", () => {
  it("declines when the AI did not ask to flag the account", () => {
    const verdict: AiScreenVerdict = { ...block_and_flag, flag_account: false };

    expect(should_honor_account_flag(verdict, [scam_keyword_signal], 80)).toBe(false);
  });

  it("declines when the AI flagged without a block verdict", () => {
    const verdict: AiScreenVerdict = { ...block_and_flag, advice: "warn" };

    expect(should_honor_account_flag(verdict, [scam_keyword_signal], 80)).toBe(false);
  });

  it("declines when no AI verdict was obtained", () => {
    expect(should_honor_account_flag(null, [scam_keyword_signal], 80)).toBe(false);
  });

  it("declines for a new payee whose score rests on being new", () => {
    const score_barely_over_warn = new_payee_signal.weight + 30;

    expect(
      should_honor_account_flag(block_and_flag, [new_payee_signal], score_barely_over_warn),
    ).toBe(false);
  });

  it("honors the flag for a new payee with strong independent evidence", () => {
    const score = 80;

    expect(
      should_honor_account_flag(
        block_and_flag,
        [new_payee_signal, scam_keyword_signal],
        score,
      ),
    ).toBe(true);
  });

  it("honors the flag for a known payee without the new-payee guard", () => {
    expect(should_honor_account_flag(block_and_flag, [scam_keyword_signal], 72)).toBe(true);
  });
});
