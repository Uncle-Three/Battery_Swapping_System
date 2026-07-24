import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  station: { findFirst: vi.fn() },
  serviceBay: { findMany: vi.fn() },
  bayTimeSlot: { findMany: vi.fn(), updateMany: vi.fn() },
}));

vi.mock("../config/database", () => ({ prisma: db }));

import { bayTimeSlotService } from "../modules/bay-time-slots/bay-time-slot.service";

describe("customer bay time slot availability", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.station.findFirst.mockResolvedValue({
      id: "station-1",
      openingTime: "08:00",
      closingTime: "17:00",
      workingDays: ["MON"],
    });
    db.serviceBay.findMany.mockResolvedValue([{ id: "bay-1" }]);
    db.bayTimeSlot.updateMany.mockResolvedValue({ count: 0 });
  });

  it("returns only dates that have an unassigned slot inside station operating days and hours", async () => {
    db.bayTimeSlot.findMany.mockResolvedValue([
      { startAt: new Date("2026-07-27T01:00:00.000Z"), endAt: new Date("2026-07-27T02:00:00.000Z") },
      { startAt: new Date("2026-07-27T00:00:00.000Z"), endAt: new Date("2026-07-27T01:00:00.000Z") },
      { startAt: new Date("2026-07-26T01:00:00.000Z"), endAt: new Date("2026-07-26T02:00:00.000Z") },
    ]);

    await expect(bayTimeSlotService.availableDates("station-1")).resolves.toMatchObject({
      dates: ["2026-07-27"],
      dateFrom: "2026-07-27",
      dateTo: "2026-07-27",
      openingTime: "08:00",
      closingTime: "17:00",
      workingDays: ["MON"],
    });
    expect(db.bayTimeSlot.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        OR: [{ bookingId: null }, { bookingId: { isSet: false } }],
      }),
    }));
  });
});
