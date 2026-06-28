import { describe, expect, it } from "vitest";
import { score_anomaly } from "./anomaly_agent";
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

describe("score_anomaly", () => {
  it("flags an amount beyond two standard deviations of the population", () => {
    const signals = score_anomaly(build_context({ amount: 5000 }), {
      population_mean: 200,
      population_stddev: 150,
      recent_count: 0,
    });
    expect(signals.map((signal) => signal.code)).toContain("POPULATION_OUTLIER");
  });

  it("flags a burst of transfers in the velocity window", () => {
    const signals = score_anomaly(build_context(), {
      population_mean: 200,
      population_stddev: 150,
      recent_count: 6,
    });
    expect(signals.map((signal) => signal.code)).toContain("HIGH_VELOCITY");
  });

  it("stays silent for a typical, isolated transfer", () => {
    const signals = score_anomaly(build_context({ amount: 210 }), {
      population_mean: 200,
      population_stddev: 150,
      recent_count: 1,
    });
    expect(signals).toHaveLength(0);
  });

  it("never flags an outlier when the population has no variance", () => {
    const signals = score_anomaly(build_context({ amount: 9000 }), {
      population_mean: 0,
      population_stddev: 0,
      recent_count: 0,
    });
    expect(signals).toHaveLength(0);
  });
});
