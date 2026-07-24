import { describe, expect, it } from "vitest";
import { BookingStatus, SwapStatus } from "@prisma/client";
import { assertBookingTransition, assertSwapTransition } from "../common/state-machines/transitions";
import { collectPaymentSchema, rollbackSwapSchema } from "../modules/staff-swaps/staff-swap.validation";

describe("phase 5 completion and compensation rules", () => {
  it("creates a direct-payment request without a wallet or cash method", () => {
    expect(collectPaymentSchema.safeParse({}).success).toBe(true);
    expect(collectPaymentSchema.safeParse({ paymentMethod: "WALLET" }).success).toBe(false);
    expect(collectPaymentSchema.safeParse({ paymentMethod: "CASH" }).success).toBe(true);
  });
  it("requires a rollback reason", () => expect(rollbackSwapSchema.safeParse({ reason: "x" }).success).toBe(false));
  it("allows transition to completed", () => {
    expect(() => assertSwapTransition(SwapStatus.INSTALLED, SwapStatus.COMPLETED)).not.toThrow();
    expect(() => assertSwapTransition(SwapStatus.PAYMENT_PENDING, SwapStatus.COMPLETED)).not.toThrow();
  });
  it("allows a checked-in booking to be cancelled during compensation", () => expect(() => assertBookingTransition(BookingStatus.CHECKED_IN, BookingStatus.CANCELLED)).not.toThrow());
});
