import { describe, expect, it } from "vitest";
import { derive_firewall_state } from "@/lib/risk/state_machine";
import { apply_ai_adjudication } from "@/lib/risk/fusion";
import { normalize_payee_key, score_behaviour, score_flagged_account } from "./behaviour_agent";
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

describe("score_flagged_account", () => {
  const blocklist_row = {
    payee_key: "mule holdings 8829",
    payee: "MULE HOLDINGS 8829",
    reason: "Confirmed mule account from prior scam reports.",
    source: "manual" as const,
  };

  it("returns null when the recipient is not blocklisted", () => {
    expect(score_flagged_account(null)).toBeNull();
  });

  it("emits the blocklist signal carrying the source and reason", () => {
    const signal = score_flagged_account(blocklist_row);
    expect(signal?.code).toBe("KNOWN_FLAGGED_ACCOUNT");
    expect(signal?.detail).toContain("manual");
    expect(signal?.detail).toContain(blocklist_row.reason);
  });

  it("alone reaches the DENY band", () => {
    const signal = score_flagged_account(blocklist_row);
    expect(derive_firewall_state(signal?.weight ?? 0)).toBe("DENY");
  });

  it("cannot be washed to allow even by the AI's maximum downward pull", () => {
    const signal_weight = score_flagged_account(blocklist_row)?.weight ?? 0;
    const { final_score } = apply_ai_adjudication(signal_weight, 0);
    expect(derive_firewall_state(final_score)).not.toBe("PASS");
    expect(derive_firewall_state(final_score)).not.toBe("INSPECT");
  });
});
