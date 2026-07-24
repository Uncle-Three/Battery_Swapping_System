import { describe, expect, it } from "vitest";
import {
  calculateBookingExpiry,
  normalizeBookingHoldMinutes,
  remainingBookingHoldMinutes,
} from "../modules/bookings/booking-expiry";

describe("booking hold expiry", () => {
  const now = new Date("2026-07-23T10:00:00.000Z");

  it("starts the configured hold duration at the appointment time", () => {
    const expiry = calculateBookingExpiry(new Date("2026-07-24T10:00:00.000Z"), 45);
    expect(expiry.toISOString()).toBe("2026-07-24T10:45:00.000Z");
  });

  it("never expires a booking before its appointment starts", () => {
    const scheduledStart = new Date("2026-07-23T10:10:00.000Z");
    const expiry = calculateBookingExpiry(scheduledStart, 30);
    expect(expiry.getTime()).toBeGreaterThan(scheduledStart.getTime());
    expect(expiry.toISOString()).toBe("2026-07-23T10:40:00.000Z");
  });

  it("falls back for invalid setting values", () => {
    expect(normalizeBookingHoldMinutes("invalid")).toBe(30);
    expect(normalizeBookingHoldMinutes(0)).toBe(30);
  });

  it("rounds the remaining time up for a user-facing minute count", () => {
    const expiry = new Date("2026-07-23T10:05:01.000Z");
    expect(remainingBookingHoldMinutes(expiry, now)).toBe(6);
  });
});
