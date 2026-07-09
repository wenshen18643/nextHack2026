import { describe, expect, it } from "vitest";
import { clamp_specialist_points } from "./ai_specialist";

describe("clamp_specialist_points", () => {
  it("passes through points inside the budget, rounded to integers", () => {
    expect(clamp_specialist_points(20.6, 33)).toBe(21);
  });

  it("caps points above the budget at the budget", () => {
    expect(clamp_specialist_points(90, 34)).toBe(34);
  });

  it("floors negative points at zero", () => {
    expect(clamp_specialist_points(-5, 33)).toBe(0);
  });

  it("maps non-finite garbage to zero", () => {
    expect(clamp_specialist_points(Number.NaN, 33)).toBe(0);
    expect(clamp_specialist_points(Number.POSITIVE_INFINITY, 33)).toBe(0);
  });
});
