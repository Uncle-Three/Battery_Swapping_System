import { describe, expect, it } from "vitest";
import { BatteryOperationalStatus, BatterySafetyState, BookingStatus, PaymentStatus, SwapStatus } from "@prisma/client";
import {
  assertBatteryOperationalTransition,
  assertBatterySafetyTransition,
  assertSwapTransition,
  assertBookingTransition,
  assertPaymentTransition,
} from "../common/state-machines/transitions";

describe("domain state machines", () => {
  it("allows a monitored battery to become unsafe", () => {
    expect(() => assertBatterySafetyTransition(BatterySafetyState.SAFE, BatterySafetyState.UNSAFE)).not.toThrow();
  });

  it("prevents a retired battery becoming available", () => {
    expect(() => assertBatteryOperationalTransition(BatteryOperationalStatus.RETIRED, BatteryOperationalStatus.AVAILABLE))
      .toThrow(/Invalid battery operational state transition/);
  });

  it("prevents staff skipping swap steps", () => {
    expect(() => assertSwapTransition(SwapStatus.VERIFIED, SwapStatus.INSTALLED))
      .toThrow(/Invalid swap state transition/);
  });

  it("allows a failed swap to roll back", () => {
    expect(() => assertSwapTransition(SwapStatus.FAILED, SwapStatus.ROLLED_BACK)).not.toThrow();
  });

  it("requires approval before check-in", () => {
    expect(() => assertBookingTransition(BookingStatus.PENDING_APPROVAL, BookingStatus.CHECKED_IN)).toThrow();
    expect(() => assertBookingTransition(BookingStatus.APPROVED, BookingStatus.CHECKED_IN)).not.toThrow();
  });

  it("allows refund only after successful payment", () => {
    expect(() => assertPaymentTransition(PaymentStatus.PENDING, PaymentStatus.REFUNDED)).toThrow();
    expect(() => assertPaymentTransition(PaymentStatus.SUCCESS, PaymentStatus.REFUNDED)).not.toThrow();
  });
});
