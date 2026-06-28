import { describe, expect, it } from "vitest";
import { normalize_payee_key, score_behaviour } from "./behaviour_agent";
import type { TransferContext } from "./types";

function build_context(overrides: Partial<TransferContext> = {}): TransferContext {
  return {
    payee: "Acme Sdn Bhd",
    amount: 100,
    currency: "MYR",
    channel: "browser_extension",
    observed_at: "2026-06-28T00:00:00.000Z",
    ...overrides,
  };
}

describe("normalize_payee_key", () => {
  it("trims and lowercases so casing and spacing collapse to one key", () => {
    expect(normalize_payee_key("  Crypto Ventures  ")).toBe("crypto ventures");
    expect(normalize_payee_key("CRYPTO ventures")).toBe("crypto ventures");
  });
});

describe("score_behaviour", () => {
  it("flags a never-before-seen recipient", () => {
    const signals = score_behaviour(build_context(), {
      payee_count: 0,
      payee_avg_amount: 0,
      prior_flag_count: 0,
    });
    expect(signals).toHaveLength(1);
    expect(signals[0]?.code).toBe("NEW_PAYEE");
  });

  it("flags an amount far above the recipient's usual", () => {
    const signals = score_behaviour(build_context({ amount: 5000 }), {
      payee_count: 12,
      payee_avg_amount: 200,
      prior_flag_count: 0,
    });
    expect(signals).toHaveLength(1);
    expect(signals[0]?.code).toBe("PAYEE_AMOUNT_SPIKE");
  });

  it("stays silent for a known recipient at a normal amount", () => {
    const signals = score_behaviour(build_context({ amount: 220 }), {
      payee_count: 12,
      payee_avg_amount: 200,
      prior_flag_count: 0,
    });
    expect(signals).toHaveLength(0);
  });

  it("flags a recipient previously flagged for suspicious behavior", () => {
    const signals = score_behaviour(build_context({ amount: 220 }), {
      payee_count: 12,
      payee_avg_amount: 200,
      prior_flag_count: 2,
    });
    expect(signals).toHaveLength(1);
    expect(signals[0]?.code).toBe("REPEAT_FLAGGED_PAYEE");
  });

  it("compounds a prior flag with an amount spike", () => {
    const signals = score_behaviour(build_context({ amount: 5000 }), {
      payee_count: 12,
      payee_avg_amount: 200,
      prior_flag_count: 1,
    });
    expect(signals.map((signal) => signal.code)).toEqual([
      "REPEAT_FLAGGED_PAYEE",
      "PAYEE_AMOUNT_SPIKE",
    ]);
  });
});
