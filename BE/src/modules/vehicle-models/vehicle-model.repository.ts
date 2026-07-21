import { prisma } from "../../config/database";
import type { Prisma } from "@prisma/client";

export const vehicleModelRepository = {
  findMany: () => prisma.vehicleModel.findMany({ orderBy: { manufacturer: "asc" } }),
  findById: (id: string) => prisma.vehicleModel.findUnique({ where: { id } }),
  create: (data: Prisma.VehicleModelCreateInput) => prisma.vehicleModel.create({ data }),
  update: (id: string, data: Prisma.VehicleModelUpdateInput) => prisma.vehicleModel.update({ where: { id }, data }),
  delete: (id: string) => prisma.vehicleModel.delete({ where: { id } }),
};
