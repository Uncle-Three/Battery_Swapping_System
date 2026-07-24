import { beforeEach, describe, expect, it, vi } from "vitest";
import { BookingStatus, ReservationStatus } from "@prisma/client";

const db = vi.hoisted(() => ({
  stationAssignment: { findMany: vi.fn() }, booking: { findFirst: vi.fn() }, serviceBay: { findFirst: vi.fn() },
  station: { findMany: vi.fn() }, swapTransaction: { findFirst: vi.fn() }, $transaction: vi.fn(),
}));
vi.mock("../config/database", () => ({ prisma: db }));

import { staffSwapService } from "../modules/staff-swaps/staff-swap.service";

describe("staff swap check-in with a selected service bay", () => {
  const bookingId = "6a551f888ea51ca3f3945790"; const stationId = "6a551f888ea51ca3f394577f";
  const serviceBayId = "6a551f888ea51ca3f3945780"; const staffId = "6a53161d8786b87f8be53db2";

  beforeEach(() => {
    vi.resetAllMocks();
    const scheduledStart = new Date(Date.now() + 10 * 60_000); const scheduledEnd = new Date(scheduledStart.getTime() + 60 * 60_000);
    db.stationAssignment.findMany.mockResolvedValue([{ stationId, assignmentRole: "STAFF", effectiveFrom: new Date(Date.now() - 60_000), effectiveTo: null }]);
    db.booking.findFirst.mockResolvedValue({
      id: bookingId, stationId, serviceBayId, userId: "user", vehicleId: "vehicle", batteryId: null,
      status: BookingStatus.APPROVED, scheduledStart, scheduledEnd,
      bayReservations: [{ id: "reservation", serviceBayId, status: ReservationStatus.ACTIVE }],
    });
    db.serviceBay.findFirst.mockResolvedValue({ id: serviceBayId, stationId, bayCode: "K01", status: "AVAILABLE" });
    db.swapTransaction.findFirst.mockResolvedValue(null);
  });

  it("starts inspection without requiring a pre-reserved battery and persists the chosen bay", async () => {
    const tx = {
      booking: { update: vi.fn().mockResolvedValue({}) }, slotReservation: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
      swapTransaction: { create: vi.fn().mockResolvedValue({ id: "swap" }) }, swapStepHistory: { create: vi.fn().mockResolvedValue({}) },
    };
    db.$transaction.mockImplementation((callback: (client: typeof tx) => unknown) => callback(tx));

    await expect(staffSwapService.checkIn(bookingId, stationId, serviceBayId, staffId, "STAFF")).resolves.toEqual({ id: "swap" });
    expect(tx.booking.update).toHaveBeenCalledWith({ where: { id: bookingId }, data: { status: BookingStatus.CHECKED_IN, serviceBayId } });
  });

  it("rejects a different bay from the bay occupied by the customer booking", async () => {
    await expect(staffSwapService.checkIn(bookingId, stationId, "6a551f888ea51ca3f3945781", staffId, "STAFF")).rejects.toMatchObject({ statusCode: 409 });
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("loads only approved customer bookings inside assigned station bays", async () => {
    db.station.findMany.mockResolvedValue([]);
    await staffSwapService.getContext("admin", "ADMIN");
    expect(db.station.findMany).toHaveBeenCalledWith(expect.objectContaining({
      select: expect.objectContaining({ serviceBays: expect.objectContaining({
        select: expect.objectContaining({ bookings: expect.objectContaining({ where: { status: BookingStatus.APPROVED } }) }),
      }) }),
    }));
  });

  it("does not return stations or vehicles when staff is outside the assigned shift", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-24T16:00:00.000Z")); // 23:00 in Vietnam
    try {
      db.stationAssignment.findMany.mockResolvedValue([{
        stationId,
        assignmentRole: "STAFF",
        effectiveFrom: new Date("2026-07-01T00:00:00.000Z"),
        effectiveTo: null,
        shift: "Tất cả các buổi",
      }]);
      db.station.findMany.mockResolvedValue([]);
      db.swapTransaction.findFirst.mockResolvedValue(null);

      const result = await staffSwapService.getContext(staffId, "STAFF");

      expect(result).toMatchObject({
        stations: [],
        assignmentState: "OUTSIDE_SHIFT",
      });
      expect(db.station.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: { in: [] }, status: "ACTIVE" },
      }));
    } finally {
      vi.useRealTimers();
    }
  });
});
