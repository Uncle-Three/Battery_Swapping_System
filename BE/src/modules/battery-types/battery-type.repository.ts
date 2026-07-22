import { prisma } from "../../config/database";
import type { Prisma } from "@prisma/client";

export const batteryTypeRepository = {
  findMany: () => prisma.batteryType.findMany({ orderBy: { code: "asc" } }),
  findById: (id: string) => prisma.batteryType.findUnique({ where: { id } }),
  create: (data: Prisma.BatteryTypeCreateInput) => prisma.batteryType.create({ data }),
  update: (id: string, data: Prisma.BatteryTypeUpdateInput) => prisma.batteryType.update({ where: { id }, data }),
  delete: (id: string) => prisma.batteryType.delete({ where: { id } }),
};
