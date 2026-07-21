import { BatteryOperationalStatus, BatterySafetyState, SlotStatus, StationStatus } from "@prisma/client";
import { prisma } from "../../config/database";

const includeSlots = {
  slots: {
    orderBy: { slotNumber: "asc" as const },
    include: { batteries: { where: { operationalStatus: BatteryOperationalStatus.AVAILABLE }, take: 1 } },
  },
};

export const stationRepository = {
  findMany: (filters?: { includeInactive?: boolean }) =>
    prisma.station.findMany({
      where: filters?.includeInactive ? undefined : { status: StationStatus.ACTIVE },
      include: includeSlots,
      orderBy: { name: "asc" },
    }),
  findById: (id: string) => prisma.station.findUnique({ where: { id }, include: includeSlots }),
  
  // Admin CRUD
  create: (data: any) =>
    prisma.station.create({
      data,
      include: includeSlots,
    }),
  update: (id: string, data: Partial<{ name: string; address: string; latitude: number; longitude: number; status: StationStatus }>) =>
    prisma.station.update({
      where: { id },
      data,
      include: includeSlots,
    }),
  delete: (id: string) => prisma.station.delete({ where: { id } }),

  findSlots: (id: string) => prisma.batterySlot.findMany({ where: { stationId: id }, include: { batteries: true }, orderBy: { slotNumber: "asc" } }),
  findAvailability: (stationId: string, batteryTypeId: string, startsAt: Date, endsAt: Date) =>
    prisma.batterySlot.findMany({
      where: {
        stationId,
        status: { in: [SlotStatus.READY, SlotStatus.EMPTY] },
        reservations: { none: { status: "ACTIVE", startsAt: { lt: endsAt }, endsAt: { gt: startsAt } } },
      },
      include: {
        batteries: {
          where: {
            batteryTypeId,
            safetyState: BatterySafetyState.SAFE,
            operationalStatus: BatteryOperationalStatus.AVAILABLE,
            reservations: { none: { status: "ACTIVE", startsAt: { lt: endsAt }, endsAt: { gt: startsAt } } },
          },
        },
      },
    }),
  findServiceBays: (stationId: string) => prisma.serviceBay.findMany({
    where: { stationId, status: "AVAILABLE" }, orderBy: { bayCode: "asc" },
  }),
};
