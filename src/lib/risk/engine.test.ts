import { describe, expect, it, vi } from "vitest";
import { evaluate_transaction } from "./engine";
import type { AiAdjudicator } from "./engine";
import { baseline_profile, make_transaction } from "./fixtures";

const never_adjudicate: AiAdjudicator = vi.fn(async () => null);

describe("evaluate_transaction", () => {
  it("passes a normal in-profile transfer without invoking the AI", async () => {
    const adjudicator = vi.fn(async () => null);
    const result = await evaluate_transaction({
      transaction: make_transaction(),
      profile: baseline_profile,
      recent_transactions: [],
      adjudicator,
    });

    expect(result.state).toBe("PASS");
    expect(result.ai_used).toBe(false);
    expect(adjudicator).not.toHaveBeenCalled();
  });

  it("denies an obvious high-risk transfer on deterministic signals alone", async () => {
    const result = await evaluate_transaction({
      transaction: make_transaction({
        payee: "payee_scammer",
        amount: 5000,
        device: "device_stranger",
        created_at: "2026-06-26T03:00:00.000Z",
      }),
      profile: baseline_profile,
      recent_transactions: [],
      adjudicator: never_adjudicate,
    });

    expect(result.state).toBe("DENY");
    expect(result.ai_used).toBe(false);
  });

  it("invokes the AI adjudicator only in the ambiguous mid-band", async () => {
    const adjudicator = vi.fn(async () => ({
      layer: "ai" as const,
      code: "AI_CONTEXT_RISK",
      weight: 30,
      detail: "Pattern resembles a mule-account hand-off.",
    }));

    const result = await evaluate_transaction({
      transaction: make_transaction({
        payee: "payee_unknown",
        created_at: "2026-06-26T03:00:00.000Z",
      }),
      profile: baseline_profile,
      recent_transactions: [],
      adjudicator,
    });

    expect(adjudicator).toHaveBeenCalledOnce();
    expect(result.ai_used).toBe(true);
    expect(result.signals.some((signal) => signal.layer === "ai")).toBe(true);
  });

  it("survives an abstaining adjudicator without marking AI as used", async () => {
    const result = await evaluate_transaction({
      transaction: make_transaction({
        payee: "payee_unknown",
        created_at: "2026-06-26T03:00:00.000Z",
      }),
      profile: baseline_profile,
      recent_transactions: [],
      adjudicator: async () => null,
    });

    expect(result.ai_used).toBe(false);
  });
});
