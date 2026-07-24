import type { Prisma, StationAssignmentRole } from "@prisma/client";
import { prisma } from "../../config/database";

export const stationAssignmentRepository = {
  findMany: async () => {
    const assignments = await prisma.stationAssignment.findMany({ orderBy: { createdAt: "desc" } });
    const [users, stations] = await Promise.all([
      prisma.user.findMany({ where: { id: { in: assignments.map((item) => item.userId) } }, select: { id: true, fullName: true, email: true, role: { select: { name: true } } } }),
      prisma.station.findMany({ where: { id: { in: assignments.map((item) => item.stationId) } } }),
    ]);
    const userById = new Map(users.map((user) => [user.id, user]));
    const stationById = new Map(stations.map((station) => [station.id, station]));
    return assignments.flatMap((assignment) => {
      const user = userById.get(assignment.userId); const station = stationById.get(assignment.stationId);
      return user && station ? [{ ...assignment, user, station }] : [];
    });
  },
  findUser: (id: string) => prisma.user.findUnique({ where: { id }, select: { id: true, role: { select: { name: true } } } }),
  findStation: (id: string) => prisma.station.findUnique({ where: { id }, select: { id: true } }),
  create: (data: Prisma.StationAssignmentUncheckedCreateInput) => prisma.stationAssignment.create({ data }),
  deactivate: (id: string) => prisma.stationAssignment.update({ where: { id }, data: { active: false, effectiveTo: new Date() } }),
  findExisting: (userId: string, stationId: string, assignmentRole: StationAssignmentRole) =>
    prisma.stationAssignment.findFirst({ where: { userId, stationId, assignmentRole } }),
  deactivateOthers: (userId: string, assignmentRole: StationAssignmentRole, stationId: string) =>
    prisma.stationAssignment.updateMany({
      where: { userId, assignmentRole, stationId: { not: stationId }, active: true },
      data: { active: false, effectiveTo: new Date() },
    }),
  reactivate: (id: string, effectiveFrom: Date, effectiveTo?: Date, shift?: string) =>
    prisma.stationAssignment.update({ where: { id }, data: { active: true, effectiveFrom, effectiveTo: effectiveTo ?? null, shift } }),
};
