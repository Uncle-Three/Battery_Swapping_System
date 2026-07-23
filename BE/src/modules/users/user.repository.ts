import { Prisma } from "@prisma/client";
import { prisma } from "../../config/database";

export const userRepository = {
  findById: (id: string) =>
    prisma.user.findFirst({
      where: { id },
      include: { role: true, wallet: true },
    }),

  findByPhone: (phone: string) =>
    prisma.user.findFirst({
      where: { phone },
      include: { role: true, wallet: true },
    }),

  updateProfile: (id: string, data: { fullName?: string; phone?: string | null; avatarUrl?: string | null }) =>
    prisma.user.update({
      where: { id },
      data,
      include: { role: true, wallet: true },
    }),

  findMany: () =>
    prisma.user.findMany({
      include: { role: true, wallet: true },
      orderBy: { createdAt: "desc" },
    }),

  findVehicles: (userId: string) => prisma.vehicle.findMany({
    where: { userId },
    include: {
      vehicleModel: true,
      batteryAssignments: { where: { active: true }, include: { battery: { include: { batteryType: true } } } },
    },
    orderBy: { createdAt: "desc" },
  }),
  findVehicleDetail: (userId: string, id: string) => prisma.vehicle.findFirst({
    where: { id, userId },
    include: {
      vehicleModel: true,
      batteryAssignments: { where: { active: true }, include: { battery: { include: { batteryType: true, healthLogs: { orderBy: { recordedAt: "desc" }, take: 50 } } } } },
      replacementRequests: { orderBy: { createdAt: "desc" }, take: 20 },
      bookings: { orderBy: { createdAt: "desc" }, take: 20, include: { station: true } },
    },
  }),
  findMemberDashboard: async (userId: string) => {
    const now = new Date();
    const [user, safetyRules] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true, fullName: true, email: true,
          vehicles: {
            orderBy: { createdAt: "asc" },
            include: {
              vehicleModel: true,
              batteryAssignments: { where: { active: true }, include: { battery: { include: { batteryType: true, healthLogs: { orderBy: { recordedAt: "desc" }, take: 10 } } } } },
              replacementRequests: { where: { status: { notIn: ["COMPLETED", "CANCELLED"] } }, orderBy: { priority: "desc" }, take: 5 },
              bookings: { where: { status: { in: ["CREATED", "PENDING_APPROVAL", "APPROVED", "RESCHEDULE_PROPOSED", "RESCHEDULED", "CHECKED_IN"] } }, orderBy: { createdAt: "desc" }, take: 1, include: { station: true } },
            },
          },
          notifications: { where: { status: { not: "ARCHIVED" } }, orderBy: { createdAt: "desc" }, take: 10 },
        },
      }),
      prisma.batterySafetyRule.findMany({
        where: { active: true, effectiveFrom: { lte: now } },
        orderBy: { version: "desc" },
      }),
    ]);
    const safetyRule = safetyRules.find((rule) =>
      (rule.stationId === null || rule.stationId === undefined) &&
      (rule.effectiveTo === null || rule.effectiveTo === undefined || rule.effectiveTo > now)) ?? null;
    return user ? { user: { id: user.id, fullName: user.fullName, email: user.email }, vehicles: user.vehicles, notifications: user.notifications, safetyRule } : null;
  },

  isUniqueConstraintError: (error: unknown): boolean => {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
  },
};
