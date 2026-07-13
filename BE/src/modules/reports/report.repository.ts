import { BookingStatus, PaymentStatus, ReplacementRequestStatus } from "@prisma/client";
import { prisma } from "../../config/database";
import { Roles } from "../../constants/roles";

const startForPeriod = (period: string) => {
  const now = new Date();
  const start = new Date(now);
  if (period === "week") start.setDate(now.getDate() - 7);
  else if (period === "year") start.setFullYear(now.getFullYear() - 1);
  else start.setMonth(now.getMonth() - 1);
  return start;
};

const stationIdsFor = async (userId: string, role: string) => role === Roles.ADMIN
  ? undefined
  : (await prisma.stationAssignment.findMany({ where: { userId, assignmentRole: "MANAGER", active: true }, select: { stationId: true } })).map((item) => item.stationId);

export const reportRepository = {
  getAnalytics: async (userId: string, role: string, period = "month") => {
    const stationIds = await stationIdsFor(userId, role);
    const stationWhere = stationIds ? { stationId: { in: stationIds } } : {};
    const createdAt = { gte: startForPeriod(period) };
    const [swaps, payments, users, bookings, replacements, safetyGroups, inspections, stations] = await Promise.all([
      prisma.swapTransaction.findMany({ where: { ...stationWhere, createdAt }, select: { stationId: true, workflowStatus: true, startedAt: true, completedAt: true, cost: true } }),
      prisma.paymentTransaction.aggregate({ where: { swapTransaction: stationWhere, status: PaymentStatus.SUCCESS, createdAt }, _sum: { amount: true }, _count: true }),
      prisma.user.count({ where: { status: "ACTIVE", createdAt } }),
      prisma.booking.groupBy({ by: ["status"], where: { ...stationWhere, createdAt }, _count: true }),
      prisma.replacementRequest.count({ where: { mandatory: true, status: { notIn: [ReplacementRequestStatus.COMPLETED, ReplacementRequestStatus.CANCELLED] }, ...(stationIds ? { bookings: { some: { stationId: { in: stationIds } } } } : {}) } }),
      prisma.battery.groupBy({ by: ["safetyState"], where: stationIds ? { OR: [{ stationId: { in: stationIds } }, { stationId: null }] } : {}, _count: true }),
      prisma.batteryInspection.groupBy({ by: ["outcome"], where: stationIds ? { swapTransaction: { stationId: { in: stationIds } } } : {}, _count: true }),
      prisma.station.findMany({ where: stationIds ? { id: { in: stationIds } } : {}, select: { id: true, name: true, status: true, slots: { select: { id: true } } } }),
    ]);
    const stationStats = stations.map((station) => {
      const stationSwaps = swaps.filter((swap) => swap.stationId === station.id);
      const completed = stationSwaps.filter((swap) => swap.workflowStatus === "COMPLETED");
      return { id: station.id, name: station.name, status: station.status, swaps: completed.length, revenue: completed.reduce((sum, swap) => sum + swap.cost, 0), slotCount: station.slots.length };
    });
    const completed = swaps.filter((swap) => swap.workflowStatus === "COMPLETED");
    const durations = completed.filter((swap) => swap.completedAt).map((swap) => swap.completedAt!.getTime() - swap.startedAt.getTime());
    const bookingCount = Object.fromEntries(bookings.map((item) => [item.status, item._count]));
    return {
      period, totalSwaps: completed.length, activeUsers: users, revenue: payments._sum.amount ?? 0,
      averageReplacementMinutes: durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length / 60_000) : 0,
      approvalRate: ((bookingCount[BookingStatus.APPROVED] ?? 0) + (bookingCount[BookingStatus.CHECKED_IN] ?? 0) + (bookingCount[BookingStatus.COMPLETED] ?? 0)) / Math.max(1, Object.values(bookingCount).reduce((a, b) => a + b, 0)) * 100,
      failureRate: swaps.filter((swap) => ["FAILED", "ROLLED_BACK"].includes(swap.workflowStatus)).length / Math.max(1, swaps.length) * 100,
      mandatoryOpen: replacements, batterySafety: Object.fromEntries(safetyGroups.map((item) => [item.safetyState, item._count])),
      bookingStatuses: bookingCount, inspectionOutcomes: Object.fromEntries(inspections.map((item) => [item.outcome, item._count])), stationStats,
    };
  },
  getInventory: async (userId: string, role: string) => {
    const stationIds = await stationIdsFor(userId, role);
    const where = stationIds ? { stationId: { in: stationIds } } : {};
    const [batteries, operational, safety] = await Promise.all([
      prisma.battery.findMany({ where, include: { batteryType: true, station: { select: { id: true, name: true } } }, orderBy: { updatedAt: "desc" }, take: 500 }),
      prisma.battery.groupBy({ by: ["operationalStatus"], where, _count: true }),
      prisma.battery.groupBy({ by: ["safetyState"], where, _count: true }),
    ]);
    return { totalBatteries: batteries.length, byOperationalStatus: Object.fromEntries(operational.map((item) => [item.operationalStatus, item._count])), bySafetyState: Object.fromEntries(safety.map((item) => [item.safetyState, item._count])), batteries };
  },
};
