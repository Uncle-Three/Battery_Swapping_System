import { describe, expect, it } from "vitest";
import { BatterySafetyState } from "@prisma/client";
import { evaluateBatterySafety } from "../modules/battery-health/battery-health.service";
import { batteryTelemetrySchema } from "../modules/battery-health/battery-health.validation";

const rule = {
  minimumSohSafe: 80,
  minimumSohWarning: 70,
  minimumSoc: 10,
  maximumTemperature: 55,
  minimumVoltage: 320,
  maximumVoltage: 450,
};

const telemetry = {
  soc: 80,
  soh: 90,
  cycleCount: 200,
  temperature: 35,
  voltage: 400,
  dataSource: "BMS_TEST",
};

describe("battery safety evaluation", () => {
  it("classifies healthy telemetry as SAFE", () => {
    expect(evaluateBatterySafety(telemetry, rule)).toBe(BatterySafetyState.SAFE);
  });

  it("classifies degraded SOH as WARNING", () => {
    expect(evaluateBatterySafety({ ...telemetry, soh: 75 }, rule)).toBe(BatterySafetyState.WARNING);
  });

  it("classifies unsafe temperature or voltage as UNSAFE", () => {
    expect(evaluateBatterySafety({ ...telemetry, temperature: 60 }, rule)).toBe(BatterySafetyState.UNSAFE);
    expect(evaluateBatterySafety({ ...telemetry, voltage: 300 }, rule)).toBe(BatterySafetyState.UNSAFE);
  });

  it("rejects invalid telemetry ranges", () => {
    expect(batteryTelemetrySchema.safeParse({ ...telemetry, soh: 101 }).success).toBe(false);
    expect(batteryTelemetrySchema.safeParse({ ...telemetry, cycleCount: -1 }).success).toBe(false);
  });
});
