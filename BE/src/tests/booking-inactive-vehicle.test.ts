import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  vehicle: { findFirst: vi.fn() },
  batterySlot: { findFirst: vi.fn() },
  serviceBay: { findFirst: vi.fn(), findMany: vi.fn() },
  bayTimeSlot: { findFirst: vi.fn() },
  station: { findFirst: vi.fn() },
  systemSetting: { findUnique: vi.fn(), findMany: vi.fn() },
  booking: { findFirst: vi.fn() },
}));

vi.mock("../config/database", () => ({ prisma: db }));

import { bookingService } from "../modules/bookings/booking.service";

const input = {
  vehicleId: "6a54b42f1a755d82b5c480df",
  stationId: "6a54b42f1a755d82b5c480e0",
  serviceBayId: "6a54b42f1a755d82b5c480e1",
  scheduledStart: new Date("2030-01-01T08:00:00.000Z"),
  scheduledEnd: new Date("2030-01-01T09:00:00.000Z"),
};

describe("vehicle booking guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.vehicle.findFirst.mockResolvedValue({ id: input.vehicleId, status: "INACTIVE", batteryAssignments: [] });
    db.serviceBay.findFirst.mockResolvedValue({ id: input.serviceBayId });
    db.systemSetting.findUnique.mockResolvedValue(null);
    db.systemSetting.findMany.mockResolvedValue([]);
    db.serviceBay.findMany.mockResolvedValue([]);
    db.station.findFirst.mockResolvedValue({
      id: input.stationId,
      openingTime: "00:00",
      closingTime: "23:59",
      workingDays: [],
    });
  });

  it("rejects a quote for an inactive vehicle", async () => {
    await expect(bookingService.quote("user-1", input)).rejects.toThrow("Xe đang tắt nên không thể đặt lịch thay pin");
  });

  it("rejects creating a booking for an inactive vehicle", async () => {
    await expect(bookingService.create("user-1", input)).rejects.toThrow("Xe đang tắt nên không thể đặt lịch thay pin");
    expect(db.booking.findFirst).not.toHaveBeenCalled();
  });

  it("rejects a quote when the vehicle already has an active booking", async () => {
    db.vehicle.findFirst.mockResolvedValue({ id: input.vehicleId, status: "ACTIVE", batteryAssignments: [] });
    db.booking.findFirst.mockResolvedValue({ id: "active-booking" });
    await expect(bookingService.quote("user-1", input)).rejects.toThrow("Vehicle already has an active booking");
  });

  it("rejects a second booking for the same vehicle", async () => {
    db.vehicle.findFirst.mockResolvedValue({ id: input.vehicleId, status: "ACTIVE", batteryAssignments: [] });
    db.booking.findFirst.mockResolvedValue({
      id: "active-booking",
      stationId: "another-station",
      serviceBayId: "another-bay",
      scheduledStart: new Date("2030-01-02T08:00:00.000Z"),
    });
    await expect(bookingService.create("user-1", input)).rejects.toThrow("Vehicle already has an active booking");
  });

  it("quotes an available slot by filtering on operational bay ids", async () => {
    db.vehicle.findFirst.mockResolvedValue({ id: input.vehicleId, status: "ACTIVE", batteryAssignments: [] });
    db.booking.findFirst.mockResolvedValue(null);
    db.serviceBay.findMany.mockResolvedValue([{ id: input.serviceBayId }]);
    db.bayTimeSlot.findFirst.mockResolvedValue({ id: "slot-1" });

    await expect(bookingService.quote("user-1", input)).resolves.toMatchObject({
      amount: 45000,
      currency: "VND",
      scheduledStart: input.scheduledStart,
      scheduledEnd: input.scheduledEnd,
    });
    expect(db.bayTimeSlot.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ bayId: { in: [input.serviceBayId] } }),
    }));
  });

  it("rejects a quote outside the station operating schedule", async () => {
    db.vehicle.findFirst.mockResolvedValue({ id: input.vehicleId, status: "ACTIVE", batteryAssignments: [] });
    db.booking.findFirst.mockResolvedValue(null);
    db.station.findFirst.mockResolvedValue({
      id: input.stationId,
      openingTime: "16:00",
      closingTime: "17:00",
      workingDays: [],
    });

    await expect(bookingService.quote("user-1", input)).rejects.toThrow(
      "Khung giờ nằm ngoài ngày hoặc giờ hoạt động của trạm.",
    );
    expect(db.bayTimeSlot.findFirst).not.toHaveBeenCalled();
  });
});
