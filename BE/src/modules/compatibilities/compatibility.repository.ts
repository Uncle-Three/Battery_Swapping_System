import { prisma } from "../../config/database";
import type { Prisma } from "@prisma/client";

export const compatibilityRepository = {
  findMany: () => prisma.batteryCompatibility.findMany({ include: { vehicleModel: true, batteryType: true } }),
  findById: (id: string) => prisma.batteryCompatibility.findUnique({ where: { id }, include: { vehicleModel: true, batteryType: true } }),
  create: (data: Prisma.BatteryCompatibilityCreateInput) => prisma.batteryCompatibility.create({ data }),
  update: (id: string, data: Prisma.BatteryCompatibilityUpdateInput) => prisma.batteryCompatibility.update({ where: { id }, data }),
  delete: (id: string) => prisma.batteryCompatibility.delete({ where: { id } }),
};
