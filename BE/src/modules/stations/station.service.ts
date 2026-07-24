import { stationRepository } from "./station.repository";
import { prisma } from "../../config/database";
import { NotFoundError } from "../../common/errors/not-found-error";
import { BayTimeSlotStatus, Prisma } from "@prisma/client";
import { getVietnamEndOfDay, getVietnamStartOfDay } from "../../common/utils/vietnam-time";

const mapStation = <T extends { slots: Array<{ batteries: unknown[] }> }>(station: T) => ({
  ...station,
  slots: station.slots.map(({ batteries, ...slot }) => ({ ...slot, battery: batteries[0] ?? null })),
});

const unassignedSlotFilter = {
  OR: [
    { bookingId: null },
    { bookingId: { isSet: false } },
  ],
} satisfies Prisma.BayTimeSlotWhereInput;

export const bayReservationOccupiesWindow = (
  reservation: { startsAt: Date; endsAt: Date; booking: { status: string } },
  startsAt: Date,
  endsAt: Date,
) => {
  const overlapsReservedInterval = reservation.startsAt < endsAt && reservation.endsAt > startsAt;
  if (reservation.booking.status !== "CHECKED_IN") return overlapsReservedInterval;

  // A checked-in swap may run beyond its planned end, so keep the bay occupied
  // for later windows on that service day. It must never block future dates.
  const bangkokDate = (value: Date) =>
    new Date(value.getTime() + 7 * 60 * 60 * 1_000).toISOString().slice(0, 10);
  return bangkokDate(reservation.startsAt) === bangkokDate(startsAt)
    && reservation.startsAt < endsAt;
};

export const stationService = {
  list: async (filters?: { includeInactive?: boolean }) => (await stationRepository.findMany(filters)).map(mapStation),
  getById: async (id: string) => {
    const station = await stationRepository.findById(id);
    if (!station) throw new NotFoundError("Station not found");
    return mapStation(station);
  },
  getSlots: (id: string) => stationRepository.findSlots(id),
  create: async (data: any) => {
    const station = await stationRepository.create(data);
    return mapStation(station);
  },
  update: async (id: string, data: any) => {
    const station = await stationRepository.update(id, data);
    return mapStation(station);
  },
  delete: async (id: string) => {
    await stationRepository.delete(id);
    return { success: true };
  },
  bookingSchedule: async (stationId: string, vehicleId: string | undefined, date: string, durationMinutes: number, userId: string) => {
    const [station, vehicle] = await Promise.all([
      prisma.station.findFirst({ where: { id: stationId, status: "ACTIVE" } }),
      vehicleId
        ? prisma.vehicle.findFirst({ where: { id: vehicleId, userId }, select: { vehicleModelId: true } })
        : Promise.resolve(null),
    ]);
    if (!station) throw new NotFoundError("Active station not found");
    if (vehicleId && !vehicle) throw new NotFoundError("Vehicle not found");
    const openingTime = station.openingTime ?? "08:00";
    const closingTime = station.closingTime ?? "22:00";
    const compatibleTypes = vehicle?.vehicleModelId
      ? await prisma.batteryCompatibility.findMany({ where: { vehicleModelId: vehicle.vehicleModelId, active: true }, select: { batteryTypeId: true } })
      : [];

    // The customer schedule is sourced exclusively from slots created in
    // Admin Bay Time Slot Management. We intentionally do not synthesize
    // windows from station opening/closing hours.
    const managedSlots = await prisma.bayTimeSlot.findMany({
      where: {
        stationId,
        status: BayTimeSlotStatus.AVAILABLE,
        ...unassignedSlotFilter,
        startAt: {
          gt: new Date(),
          gte: getVietnamStartOfDay(date),
          lt: getVietnamEndOfDay(date),
        },
        bay: { status: { notIn: ["MAINTENANCE", "INACTIVE"] } },
      },
      include: { bay: { select: { bayCode: true, bayName: true } } },
      orderBy: [{ startAt: "asc" }, { bayId: "asc" }],
    });

    const windows = await Promise.all(managedSlots.map(async (slot) => {
      const resourcesByType = await Promise.all(compatibleTypes.map(({ batteryTypeId }) =>
        stationRepository.findAvailability(stationId, batteryTypeId, slot.startAt, slot.endAt)));
      const resources = [...new Map(resourcesByType.flat().filter((slot) => slot.batteries.length > 0).map((slot) => [slot.id, slot])).values()];
      const resource = resources[0];
      return {
        id: slot.id,
        serviceBayId: slot.bayId,
        bayCode: slot.bay.bayCode,
        bayName: slot.bay.bayName,
        startsAt: slot.startAt,
        endsAt: slot.endAt,
        durationMinutes: (slot.endAt.getTime() - slot.startAt.getTime()) / 60_000,
        status: "AVAILABLE" as const,
        batterySlotId: resource?.id ?? null,
        availableBatteryCount: resource?.batteries.length ?? 0,
      };
    }));
    return { station: { id: station.id, name: station.name, openingTime, closingTime }, date, durationMinutes, windows };
  },
  availability: async (stationId: string, vehicleId: string, startsAt: Date, endsAt: Date, userId: string) => {
    const vehicle = await prisma.vehicle.findFirst({ where: { id: vehicleId, userId }, select: { vehicleModelId: true } });
    if (!vehicle) throw new NotFoundError("Vehicle not found");
    if (!vehicle.vehicleModelId) throw new NotFoundError("Vehicle model is not configured");
    const compatibility = await prisma.batteryCompatibility.findMany({
      where: { vehicleModelId: vehicle.vehicleModelId, active: true }, select: { batteryTypeId: true },
    });
    const results = await Promise.all(compatibility.map(async ({ batteryTypeId }) => ({
      batteryTypeId,
      slots: await stationRepository.findAvailability(stationId, batteryTypeId, startsAt, endsAt),
    })));
    return results.filter((result) => result.slots.some((slot) => slot.batteries.length > 0));
  },
};
