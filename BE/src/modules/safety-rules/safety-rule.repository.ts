import { prisma } from "../../config/database";
import type { Prisma } from "@prisma/client";

export const safetyRuleRepository = {
  findMany: () => prisma.batterySafetyRule.findMany({ include: { station: true } }),
  findById: (id: string) => prisma.batterySafetyRule.findUnique({ where: { id }, include: { station: true } }),
  create: (data: Prisma.BatterySafetyRuleCreateInput) => prisma.batterySafetyRule.create({ data }),
  update: (id: string, data: Prisma.BatterySafetyRuleUpdateInput) => prisma.batterySafetyRule.update({ where: { id }, data }),
  delete: (id: string) => prisma.batterySafetyRule.delete({ where: { id } }),
};
