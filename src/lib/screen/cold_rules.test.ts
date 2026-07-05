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

  it("flags a transfer observed in the late-night window", () => {
    const late_night = new Date(2026, 0, 15, 2, 30).toISOString();
    const signals = score_cold_rules({ payee: "John Tan", amount: 300, observed_at: late_night });

    expect(signals.some((signal) => signal.code === "ODD_HOUR_TRANSFER")).toBe(true);
  });

  it("does not flag a daytime transfer", () => {
    const midday = new Date(2026, 0, 15, 13, 0).toISOString();
    const signals = score_cold_rules({ payee: "John Tan", amount: 300, observed_at: midday });

    expect(signals.some((signal) => signal.code === "ODD_HOUR_TRANSFER")).toBe(false);
  });

  it("raises the timing weight for an elderly sender without naming age", () => {
    const late_night = new Date(2026, 0, 15, 2, 30).toISOString();
    const base = { payee: "John Tan", amount: 300, observed_at: late_night };

    const adult_signal = score_cold_rules(base).find((s) => s.code === "ODD_HOUR_TRANSFER");
    const elderly_signal = score_cold_rules({ ...base, sender_age: 68 }).find(
      (s) => s.code === "ODD_HOUR_TRANSFER",
    );

    expect(elderly_signal!.weight).toBeGreaterThan(adult_signal!.weight);
    expect(elderly_signal!.detail).not.toMatch(/age|elder|old/i);
  });

  it("skips the timing rule when the timestamp is missing or invalid", () => {
    const without_timestamp = score_cold_rules({ payee: "John Tan", amount: 300 });
    const with_invalid = score_cold_rules({
      payee: "John Tan",
      amount: 300,
      observed_at: "not-a-date",
    });

    expect(without_timestamp.some((signal) => signal.code === "ODD_HOUR_TRANSFER")).toBe(false);
    expect(with_invalid.some((signal) => signal.code === "ODD_HOUR_TRANSFER")).toBe(false);
  });
});
