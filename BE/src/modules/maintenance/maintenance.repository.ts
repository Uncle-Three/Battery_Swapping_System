import type { BatteryStatus, MaintenanceSeverity } from "@prisma/client";
import { prisma } from "../../config/database";

export type CreateMaintenanceRecordInput = {
  batteryId: string;
  technicianId?: string;
  soh: number;
  soc: number;
  status: BatteryStatus;
  severity?: MaintenanceSeverity;
  notes?: string;
};

export const maintenanceRepository = {
  create: async (input: CreateMaintenanceRecordInput) =>
    prisma.maintenanceRecord.create({
      data: input,
      include: {
        battery: {
          include: {
            vehicleAssignments: {
              where: { active: true },
              include: { vehicle: { include: { user: { select: { fullName: true, email: true } } } } },
              take: 1,
            },
          },
        },
        technician: { select: { id: true, fullName: true } },
      },
    }),

  findMany: async () =>
    prisma.maintenanceRecord.findMany({
      include: {
        battery: true,
        technician: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
};
