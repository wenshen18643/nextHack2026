import { describe, expect, it } from "vitest";
import { score_scam_rules } from "./layer2_rules";
import { baseline_profile, make_transaction } from "./fixtures";

function codes_for(transaction: ReturnType<typeof make_transaction>, history = [] as ReturnType<typeof make_transaction>[]) {
  return score_scam_rules(transaction, history, baseline_profile).map((signal) => signal.code);
}

describe("score_scam_rules", () => {
  it("returns nothing for a normal transfer with no history", () => {
    expect(codes_for(make_transaction())).toEqual([]);
  });

  it("flags a velocity spike of rapid transfers", () => {
    const history = ["11:52", "11:54", "11:56", "11:58"].map((time, index) =>
      make_transaction({ id: `txn_h${index}`, created_at: `2026-06-26T${time}:00.000Z` }),
    );
    expect(codes_for(make_transaction(), history)).toContain("VELOCITY_SPIKE");
  });

  it("flags a large transfer after long dormancy", () => {
    const history = [make_transaction({ id: "txn_old", created_at: "2026-04-01T12:00:00.000Z" })];
    expect(codes_for(make_transaction({ amount: 400 }), history)).toContain(
      "POST_DORMANCY_DRAIN",
    );
  });

  it("flags round-number cash-out amounts", () => {
    expect(codes_for(make_transaction({ amount: 5000 }))).toContain("ROUND_CASHOUT");
  });

  it("flags a large transfer to a brand-new payee", () => {
    expect(codes_for(make_transaction({ payee: "payee_scammer", amount: 900 }))).toContain(
      "LARGE_NEW_PAYEE",
    );
  });
});
