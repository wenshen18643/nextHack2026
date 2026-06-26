import { describe, expect, it } from "vitest";
import { score_behavioral_baseline } from "./layer1_behavioral";
import { baseline_profile, make_transaction } from "./fixtures";

function signal_codes(transaction_overrides = {}) {
  return score_behavioral_baseline(
    make_transaction(transaction_overrides),
    baseline_profile,
  ).map((signal) => signal.code);
}

describe("score_behavioral_baseline", () => {
  it("emits no signals for a normal in-profile transfer", () => {
    expect(signal_codes()).toEqual([]);
  });

  it("flags amounts well above the user's mean", () => {
    expect(signal_codes({ amount: 2000 })).toContain("AMOUNT_DEVIATION");
  });

  it("flags a first-time payee", () => {
    expect(signal_codes({ payee: "payee_unknown" })).toContain("FIRST_TIME_PAYEE");
  });

  it("flags an unrecognized device", () => {
    expect(signal_codes({ device: "device_stranger" })).toContain("UNRECOGNIZED_DEVICE");
  });

  it("flags activity outside the user's active hours", () => {
    expect(signal_codes({ created_at: "2026-06-26T02:00:00.000Z" })).toContain(
      "OFF_HOURS_ACTIVITY",
    );
  });

  it("does not divide by zero when the profile has no spread", () => {
    const flat_profile = { ...baseline_profile, stddev_amount: 0 };
    const signals = score_behavioral_baseline(make_transaction({ amount: 9999 }), flat_profile);
    expect(signals.map((signal) => signal.code)).not.toContain("AMOUNT_DEVIATION");
  });
});
