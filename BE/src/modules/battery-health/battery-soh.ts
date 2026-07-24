import { BatteryHealthClassification } from "@prisma/client";

export const KILOMETERS_PER_SOH_PERCENT = 5_000;

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

export const calculateBatterySoh = (accumulatedMileageKm: number): number => {
  const safeMileage = Math.max(0, accumulatedMileageKm);
  return Number(clamp(100 - safeMileage / KILOMETERS_PER_SOH_PERCENT, 0, 100).toFixed(2));
};

export const inferAccumulatedMileageKm = (
  accumulatedMileageKm: number | null | undefined,
  currentSoh: number,
): number => accumulatedMileageKm ?? Math.max(0, (100 - clamp(currentSoh, 0, 100)) * KILOMETERS_PER_SOH_PERCENT);

export const classifyBatterySoh = (soh: number): BatteryHealthClassification => {
  if (soh >= 80) return BatteryHealthClassification.HEALTHY;
  if (soh >= 70) return BatteryHealthClassification.LIMITED;
  return BatteryHealthClassification.REPLACEMENT_REQUIRED;
};
