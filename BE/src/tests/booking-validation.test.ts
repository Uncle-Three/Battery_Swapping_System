import { describe, expect, it } from "vitest";
import { createBookingSchema } from "../modules/bookings/booking.validation";

const id = "507f1f77bcf86cd799439011";

describe("booking validation", () => {
  it("accepts a future booking with MongoDB IDs", () => {
    const startsAt = new Date(Date.now() + 2 * 60 * 60_000);
    startsAt.setMinutes(0, 0, 0);
    const result = createBookingSchema.safeParse({
      vehicleId: id, stationId: id, slotId: id, serviceBayId: id,
      scheduledStart: startsAt, scheduledEnd: new Date(startsAt.getTime() + 60 * 60_000),
    });
    expect(result.success).toBe(true);
  });

  it("accepts a 30-minute booking on a half-hour boundary", () => {
    const startsAt = new Date(Date.now() + 3 * 60 * 60_000);
    startsAt.setMinutes(30, 0, 0);
    expect(createBookingSchema.safeParse({
      vehicleId: id, stationId: id, slotId: id, serviceBayId: id,
      scheduledStart: startsAt, scheduledEnd: new Date(startsAt.getTime() + 30 * 60_000),
    }).success).toBe(true);
  });

  it("accepts a bay booking before the station allocates a battery slot", () => {
    const startsAt = new Date(Date.now() + 4 * 60 * 60_000);
    startsAt.setMinutes(0, 0, 0);
    expect(createBookingSchema.safeParse({
      vehicleId: id, stationId: id, serviceBayId: id,
      scheduledStart: startsAt, scheduledEnd: new Date(startsAt.getTime() + 60 * 60_000),
    }).success).toBe(true);
  });

  it("rejects past or inverted booking ranges", () => {
    const result = createBookingSchema.safeParse({
      vehicleId: id, stationId: id, slotId: id, serviceBayId: id,
      scheduledStart: new Date(Date.now() - 60_000), scheduledEnd: new Date(Date.now() - 120_000),
    });
    expect(result.success).toBe(false);
  });

  it("rejects a slot from an invalid identifier before Prisma", () => {
    const startsAt = new Date(Date.now() + 2 * 60 * 60_000);
    startsAt.setMinutes(0, 0, 0);
    const result = createBookingSchema.safeParse({
      vehicleId: id, stationId: id, slotId: "slot-1", serviceBayId: id,
      scheduledStart: startsAt, scheduledEnd: new Date(startsAt.getTime() + 60 * 60_000),
    });
    expect(result.success).toBe(false);
  });
});
