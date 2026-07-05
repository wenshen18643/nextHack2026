import { describe, expect, it } from "vitest";
import type { RiskSignal } from "./types";
import { apply_ai_adjudication, fuse_risk_score, summarize_reason } from "./fusion";

/**
 * Builds a minimal deterministic signal for fusion tests.
 */
function make_signal(weight: number, detail = "test signal"): RiskSignal {
  return { layer: "rules", code: "TEST", weight, detail };
}

describe("fuse_risk_score", () => {
  it("sums deterministic signal weights", () => {
    expect(fuse_risk_score([make_signal(20), make_signal(15)])).toBe(35);
  });

  it("clamps overflow into [0, 100]", () => {
    expect(fuse_risk_score([make_signal(80), make_signal(80)])).toBe(100);
  });

  it("returns zero for no signals", () => {
    expect(fuse_risk_score([])).toBe(0);
  });
});

describe("apply_ai_adjudication", () => {
  it("pulls a borderline score toward the AI estimate", () => {
    const { final_score, ai_adjustment } = apply_ai_adjudication(50, 70);
    expect(ai_adjustment).toBe(12);
    expect(final_score).toBe(62);
  });

  it("caps the downward swing so the AI cannot erase strong rule evidence", () => {
    const { final_score, ai_adjustment } = apply_ai_adjudication(60, 0);
    expect(ai_adjustment).toBe(-25);
    expect(final_score).toBe(35);
  });

  it("caps the upward swing so the AI cannot manufacture a block from nothing", () => {
    const { final_score, ai_adjustment } = apply_ai_adjudication(10, 100);
    expect(ai_adjustment).toBe(25);
    expect(final_score).toBe(35);
  });

  it("leaves the score unchanged when the AI agrees exactly", () => {
    const { final_score, ai_adjustment } = apply_ai_adjudication(45, 45);
    expect(ai_adjustment).toBe(0);
    expect(final_score).toBe(45);
  });

  it("clamps an out-of-range AI score before pulling", () => {
    const { final_score } = apply_ai_adjudication(50, 250);
    expect(final_score).toBe(75);
  });
});

describe("summarize_reason", () => {
  it("returns the benign message when nothing fired", () => {
    expect(summarize_reason([])).toContain("No risk signals");
  });

  it("orders details by weight and truncates to the cap", () => {
    const signals = [
      make_signal(5, "minor."),
      make_signal(40, "major."),
      make_signal(20, "medium."),
      make_signal(1, "noise."),
    ];
    expect(summarize_reason(signals, 2)).toBe("major. medium.");
  });
});
