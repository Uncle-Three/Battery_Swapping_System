import { stationRepository } from "./station.repository";
import { prisma } from "../../config/database";
import { NotFoundError } from "../../common/errors/not-found-error";
import { BadRequestError } from "../../common/errors/bad-request-error";

const mapStation = <T extends { slots: Array<{ batteries: unknown[] }> }>(station: T) => ({
  ...station,
  slots: station.slots.map(({ batteries, ...slot }) => ({ ...slot, battery: batteries[0] ?? null })),
});

export const bayReservationOccupiesWindow = (
  reservation: { startsAt: Date; endsAt: Date; booking: { status: string } },
  startsAt: Date,
  endsAt: Date,
) => {
  const heldUntilCompletion = reservation.booking.status === "APPROVED" || reservation.booking.status === "CHECKED_IN";
  return heldUntilCompletion
    ? reservation.startsAt < endsAt
    : reservation.startsAt < endsAt && reservation.endsAt > startsAt;
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
  bookingSchedule: async (stationId: string, vehicleId: string, date: string, durationMinutes: number, userId: string) => {
    const [station, vehicle, bays] = await Promise.all([
      prisma.station.findFirst({ where: { id: stationId, status: "ACTIVE" } }),
      prisma.vehicle.findFirst({ where: { id: vehicleId, userId }, select: { vehicleModelId: true } }),
      stationRepository.findServiceBays(stationId),
    ]);
    if (!station) throw new NotFoundError("Active station not found");
    if (!vehicle) throw new NotFoundError("Vehicle not found");
    const openingTime = station.openingTime ?? "08:00";
    const closingTime = station.closingTime ?? "20:00";
    const makeTime = (time: string) => new Date(`${date}T${time}:00+07:00`);
    const opensAt = makeTime(openingTime); const closesAt = makeTime(closingTime);
    if (Number.isNaN(opensAt.getTime()) || Number.isNaN(closesAt.getTime()) || closesAt <= opensAt) throw new BadRequestError("Station operating hours are invalid");
    const compatibleTypes = vehicle.vehicleModelId
      ? await prisma.batteryCompatibility.findMany({ where: { vehicleModelId: vehicle.vehicleModelId, active: true }, select: { batteryTypeId: true } })
      : [];
    const reservations = bays.length ? await prisma.bayReservation.findMany({
      where: {
        serviceBayId: { in: bays.map((bay) => bay.id) }, status: "ACTIVE", startsAt: { lt: closesAt },
        OR: [{ endsAt: { gt: opensAt } }, { booking: { status: { in: ["APPROVED", "CHECKED_IN"] } } }],
      },
      select: { serviceBayId: true, startsAt: true, endsAt: true, booking: { select: { status: true } } },
    }) : [];
    const windows = [];
    for (let cursor = new Date(opensAt); cursor.getTime() + durationMinutes * 60_000 <= closesAt.getTime(); cursor = new Date(cursor.getTime() + durationMinutes * 60_000)) {
      const startsAt = new Date(cursor); const endsAt = new Date(cursor.getTime() + durationMinutes * 60_000);
      if (startsAt <= new Date()) continue;
      const resourcesByType = await Promise.all(compatibleTypes.map(({ batteryTypeId }) => stationRepository.findAvailability(stationId, batteryTypeId, startsAt, endsAt)));
      const resources = [...new Map(resourcesByType.flat().filter((slot) => slot.batteries.length > 0).map((slot) => [slot.id, slot])).values()];
      let resourceIndex = 0;
      for (const bay of bays) {
        const occupied = reservations.some((item) => item.serviceBayId === bay.id && bayReservationOccupiesWindow(item, startsAt, endsAt));
        const resource = occupied ? undefined : resources[resourceIndex++];
        windows.push({
          id: `${bay.id}:${startsAt.toISOString()}`, serviceBayId: bay.id, bayCode: bay.bayCode, bayName: bay.bayName,
          startsAt, endsAt, durationMinutes, status: occupied ? "FULL" : "AVAILABLE",
          batterySlotId: resource?.id ?? null, availableBatteryCount: resource?.batteries.length ?? 0,
        });
      }
    }
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
