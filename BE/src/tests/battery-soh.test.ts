import { describe, expect, it } from "vitest";
import { calculateBatterySoh, inferAccumulatedMileageKm } from "../modules/battery-health/battery-soh";

describe("battery SOH by accumulated mileage", () => {
  it.each([
    [0, 100],
    [100, 99.98],
    [5_000, 99],
    [12_500, 97.5],
    [500_000, 0],
    [600_000, 0],
  ])("calculates %s km as %s%% SOH", (mileage, expectedSoh) => {
    expect(calculateBatterySoh(mileage)).toBe(expectedSoh);
  });

  it("infers legacy accumulated mileage from the stored SOH", () => {
    expect(inferAccumulatedMileageKm(undefined, 88)).toBe(60_000);
  });
});
