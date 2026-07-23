import { describe, expect, it } from "vitest";
import { inspectionSchema, serialSchema } from "../modules/staff-swaps/staff-swap.validation";
import { proposeRescheduleSchema, rejectBookingSchema } from "../modules/manager-bookings/manager-booking.validation";

describe("phase 4 workflow validation", () => {
  it("requires a meaningful rejection reason", () => expect(rejectBookingSchema.safeParse({ reason: "no" }).success).toBe(false));
  it("rejects a reschedule that is not exactly one hour", () => {
    const start = new Date(); start.setHours(start.getHours() + 2, 0, 0, 0);
    expect(proposeRescheduleSchema.safeParse({ slotId: "507f1f77bcf86cd799439011", scheduledStart: start, scheduledEnd: new Date(start.getTime() + 30 * 60_000), reason: "Trạm đang bảo trì" }).success).toBe(false);
  });
  it("validates scanned serial and state of charge", () => expect(serialSchema.safeParse({ serialNumber: "VF8-OLD-001", soc: 101 }).success).toBe(false));
  it("accepts a complete old-battery inspection", () => expect(inspectionSchema.safeParse({ serialNumber: "VF8-OLD-001", soc: 20, soh: 75, physicalCondition: "Không phồng hoặc rò rỉ", outcome: "MAINTENANCE" }).success).toBe(true));
});
