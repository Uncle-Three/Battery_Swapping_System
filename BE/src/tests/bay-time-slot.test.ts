import { describe, expect, it } from "vitest";
import { BayTimeSlotStatus } from "@prisma/client";
import { generateBaySlots } from "../common/utils/bay-slot-generation";
import {
  combineVietnamDateTime,
  formatVietnamDate,
  formatVietnamTime,
  getVietnamEndOfDay,
  getVietnamStartOfDay,
} from "../common/utils/vietnam-time";
import { validateSlotStatusTransition } from "../common/utils/slot-status-transition";
import { calculateBaySlotCooldownEndsAt } from "../common/utils/bay-slot-cooldown";
import { bulkCreateSchema, createSingleSchema, statusSchema } from "../modules/bay-time-slots/bay-time-slot.validation";

const base = {
  bayIds: ["507f1f77bcf86cd799439011"],
  dateFrom: "2099-07-25",
  dateTo: "2099-07-25",
  daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
  openingTime: "08:00",
  closingTime: "12:00",
  slotDurationMinutes: 60,
  bufferMinutes: 0,
};

describe("bay time slot generation", () => {
  it("generates consecutive 60-minute slots", () => {
    expect(generateBaySlots(base).map((slot) => `${slot.startTime}-${slot.endTime}`)).toEqual([
      "08:00-09:00",
      "09:00-10:00",
      "10:00-11:00",
      "11:00-12:00",
    ]);
  });

  it("applies buffer between slots", () => {
    const slots = generateBaySlots({ ...base, bufferMinutes: 10 });
    expect(slots.map((slot) => `${slot.startTime}-${slot.endTime}`)).toEqual([
      "08:00-09:00",
      "09:10-10:10",
      "10:20-11:20",
    ]);
  });

  it("does not generate a slot beyond closing time", () => {
    const slots = generateBaySlots({ ...base, closingTime: "10:30" });
    expect(slots).toHaveLength(2);
    expect(slots.at(-1)?.endTime).toBe("10:00");
  });

  it("generates each range for every selected bay", () => {
    const slots = generateBaySlots({
      ...base,
      bayIds: [base.bayIds[0], "507f1f77bcf86cd799439012"],
      closingTime: "10:00",
    });
    expect(slots).toHaveLength(4);
  });
});

describe("Vietnam time", () => {
  it("converts Vietnam local time to UTC without date shifting", () => {
    expect(combineVietnamDateTime("2026-07-25", "08:00").toISOString()).toBe("2026-07-25T01:00:00.000Z");
  });

  it("formats stored UTC values in Asia/Ho_Chi_Minh", () => {
    const value = new Date("2026-07-25T01:30:00.000Z");
    expect(formatVietnamDate(value)).toBe("2026-07-25");
    expect(formatVietnamTime(value)).toBe("08:30");
  });

  it("creates a 24-hour Vietnam day range", () => {
    expect(getVietnamEndOfDay("2026-07-25").getTime() - getVietnamStartOfDay("2026-07-25").getTime()).toBe(86_400_000);
  });
});

describe("slot status transitions", () => {
  it("allows AVAILABLE to OFF and OFF to AVAILABLE", () => {
    expect(() => validateSlotStatusTransition(BayTimeSlotStatus.AVAILABLE, BayTimeSlotStatus.OFF)).not.toThrow();
    expect(() => validateSlotStatusTransition(BayTimeSlotStatus.OFF, BayTimeSlotStatus.AVAILABLE)).not.toThrow();
  });

  it("allows an admin to mark an available slot as reserved", () => {
    expect(() => validateSlotStatusTransition(BayTimeSlotStatus.AVAILABLE, BayTimeSlotStatus.RESERVED)).not.toThrow();
    expect(statusSchema.safeParse({ status: "RESERVED" }).success).toBe(true);
  });

  it("allows a walk-in reservation to be completed or reopened", () => {
    expect(() => validateSlotStatusTransition(BayTimeSlotStatus.RESERVED, BayTimeSlotStatus.COMPLETED)).not.toThrow();
    expect(() => validateSlotStatusTransition(BayTimeSlotStatus.RESERVED, BayTimeSlotStatus.AVAILABLE)).not.toThrow();
    expect(() => validateSlotStatusTransition(BayTimeSlotStatus.COMPLETED, BayTimeSlotStatus.AVAILABLE)).not.toThrow();
    expect(statusSchema.safeParse({ status: "COMPLETED" }).success).toBe(true);
  });

  it("rejects RESERVED and IN_PROGRESS to OFF", () => {
    expect(() => validateSlotStatusTransition(BayTimeSlotStatus.RESERVED, BayTimeSlotStatus.OFF)).toThrow();
    expect(() => validateSlotStatusTransition(BayTimeSlotStatus.IN_PROGRESS, BayTimeSlotStatus.OFF)).toThrow();
  });
});

describe("completed slot buffer", () => {
  it("calculates the release time from the actual completion time", () => {
    const completedAt = new Date("2026-07-25T02:00:00.000Z");
    const slotEndAt = new Date("2026-07-25T03:00:00.000Z");
    expect(calculateBaySlotCooldownEndsAt(completedAt, slotEndAt, 10)?.toISOString())
      .toBe("2026-07-25T02:10:00.000Z");
  });

  it("does not reopen when the buffer reaches or passes the slot end", () => {
    const completedAt = new Date("2026-07-25T02:55:00.000Z");
    const slotEndAt = new Date("2026-07-25T03:00:00.000Z");
    expect(calculateBaySlotCooldownEndsAt(completedAt, slotEndAt, 10)).toBeNull();
  });
});

describe("slot request validation", () => {
  it("rejects a past bulk date and invalid range", () => {
    expect(bulkCreateSchema.safeParse({ ...base, dateFrom: "2020-01-02", dateTo: "2020-01-01" }).success).toBe(false);
  });

  it("rejects duplicate bay ids", () => {
    expect(bulkCreateSchema.safeParse({ ...base, bayIds: [base.bayIds[0], base.bayIds[0]] }).success).toBe(false);
  });

  it("requires a reason for BLOCKED", () => {
    expect(statusSchema.safeParse({ status: "BLOCKED" }).success).toBe(false);
    expect(createSingleSchema.safeParse({
      date: "2099-07-25",
      startTime: "08:00",
      endTime: "09:00",
      status: "BLOCKED",
    }).success).toBe(false);
  });

});
