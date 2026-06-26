import { describe, expect, it } from "vitest";
import {
  clamp_risk_score,
  derive_firewall_state,
  is_ambiguous_midband,
} from "./state_machine";

describe("clamp_risk_score", () => {
  it("bounds values into the [0, 100] domain", () => {
    expect(clamp_risk_score(-20)).toBe(0);
    expect(clamp_risk_score(140)).toBe(100);
    expect(clamp_risk_score(42)).toBe(42);
  });
});

describe("derive_firewall_state", () => {
  it("returns PASS below the inspect threshold", () => {
    expect(derive_firewall_state(0)).toBe("PASS");
    expect(derive_firewall_state(29)).toBe("PASS");
  });

  it("escalates through INSPECT and QUARANTINE", () => {
    expect(derive_firewall_state(30)).toBe("INSPECT");
    expect(derive_firewall_state(54)).toBe("INSPECT");
    expect(derive_firewall_state(55)).toBe("QUARANTINE");
    expect(derive_firewall_state(79)).toBe("QUARANTINE");
  });

  it("returns DENY at and above the deny threshold", () => {
    expect(derive_firewall_state(80)).toBe("DENY");
    expect(derive_firewall_state(100)).toBe("DENY");
  });

  it("clamps out-of-range input before mapping", () => {
    expect(derive_firewall_state(999)).toBe("DENY");
    expect(derive_firewall_state(-5)).toBe("PASS");
  });
});

describe("is_ambiguous_midband", () => {
  it("is true only between inspect and deny thresholds", () => {
    expect(is_ambiguous_midband(29)).toBe(false);
    expect(is_ambiguous_midband(30)).toBe(true);
    expect(is_ambiguous_midband(79)).toBe(true);
    expect(is_ambiguous_midband(80)).toBe(false);
  });
});
