import { describe, expect, it } from "vitest";
import { score_cold_rules } from "./cold_rules";

describe("score_cold_rules", () => {
  it("returns no signals for a small everyday transfer", () => {
    const signals = score_cold_rules({ payee: "Jaya Grocer", amount: 84.5 });

    expect(signals).toEqual([]);
  });

  it("flags a large round-number transfer with two supporting signals", () => {
    const signals = score_cold_rules({ payee: "John Tan", amount: 9000 });
    const codes = signals.map((signal) => signal.code);

    expect(codes).toContain("HIGH_ABSOLUTE_AMOUNT");
    expect(codes).toContain("ROUND_CASHOUT");
  });

  it("flags scam-script language in the memo", () => {
    const signals = score_cold_rules({
      payee: "Recipient",
      amount: 300,
      memo: "Urgent investment, double your money",
    });

    expect(signals.some((signal) => signal.code === "SCAM_KEYWORD")).toBe(true);
  });

  it("matches keywords case-insensitively in the payee name", () => {
    const signals = score_cold_rules({ payee: "CRYPTO Ventures", amount: 300 });

    expect(signals.some((signal) => signal.code === "SCAM_KEYWORD")).toBe(true);
  });
});
