import { describe, expect, it } from "vitest";
import { score_behaviour } from "@/lib/agents/behaviour_agent";
import { score_anomaly } from "@/lib/agents/anomaly_agent";
import type { TransferContext } from "@/lib/agents/types";
import { fuse_risk_score } from "@/lib/risk/fusion";
import { derive_firewall_state } from "@/lib/risk/state_machine";
import { score_cold_rules } from "./cold_rules";

/**
 * The coached-scammer scenario: a victim instructed to leave the reference
 * blank (or type something innocuous like "rent") so no text-based rule can
 * fire. These tests prove the deterministic engine still escalates purely from
 * amount, history, population, and timing signals — the evidence behind the
 * claim that Sentinel is not a keyword filter.
 */

const coached_transfer: TransferContext = {
  payee: "Personal Account 8829",
  amount: 9000,
  currency: "MYR",
  memo: "",
  channel: "browser_extension",
  observed_at: "2026-01-15T14:00:00+08:00",
};

const first_time_recipient = { payee_count: 0, payee_avg_amount: 0, prior_flag_count: 0 };
const typical_population = { population_mean: 400, population_stddev: 250, recent_count: 0 };

function collect_all_signals(context: TransferContext) {
  return [
    ...score_cold_rules({
      payee: context.payee,
      amount: context.amount,
      memo: context.memo,
      observed_at: context.observed_at,
      sender_age: context.sender_age,
    }),
    ...score_behaviour(context, first_time_recipient),
    ...score_anomaly(context, typical_population),
  ];
}

describe("coached-scammer scenario (blank memo)", () => {
  it("fires no text-based signal on a blank memo and neutral payee", () => {
    const signals = collect_all_signals(coached_transfer);

    expect(signals.some((signal) => signal.code === "SCAM_KEYWORD")).toBe(false);
  });

  it("escalates to QUARANTINE on amount, history, and population alone", () => {
    const signals = collect_all_signals(coached_transfer);
    const codes = signals.map((signal) => signal.code);
    const state = derive_firewall_state(fuse_risk_score(signals));

    expect(codes).toContain("HIGH_ABSOLUTE_AMOUNT");
    expect(codes).toContain("ROUND_CASHOUT");
    expect(codes).toContain("NEW_PAYEE");
    expect(codes).toContain("POPULATION_OUTLIER");
    expect(state).toBe("QUARANTINE");
  });

  it("reaches the DENY band for an elderly sender coached at 2 a.m.", () => {
    const elderly_late_night: TransferContext = {
      ...coached_transfer,
      observed_at: "2026-01-15T02:00:00+08:00",
      sender_age: 68,
    };
    const state = derive_firewall_state(fuse_risk_score(collect_all_signals(elderly_late_night)));

    expect(state).toBe("DENY");
  });
});
