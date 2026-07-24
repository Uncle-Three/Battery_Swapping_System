import type { RequestHandler } from "express";
import { StationAssignmentRole } from "@prisma/client";
import { prisma } from "../../config/database";
import { Roles } from "../../constants/roles";
import { UnauthorizedError } from "../errors/unauthorized-error";
import { ForbiddenError } from "../errors/forbidden-error";

type StationResolver = (request: Parameters<RequestHandler>[0]) => string | undefined;

export const authorizeStation = (
  allowedAssignments: readonly StationAssignmentRole[],
  resolveStationId: StationResolver = (request) => {
    const value: unknown = request.params.stationId ?? request.body?.stationId;
    return typeof value === "string" ? value : undefined;
  },
): RequestHandler => async (req, _res, next) => {
  try {
    if (!req.user) throw new UnauthorizedError("Authentication required");
    if (req.user.role === Roles.ADMIN) return next();

    const stationId = resolveStationId(req);
    if (!stationId) throw new ForbiddenError("Station context is required");

    const assignment = await prisma.stationAssignment.findFirst({
      where: {
        userId: req.user.id,
        stationId,
        assignmentRole: { in: [...allowedAssignments] },
        active: true,
        OR: [{ effectiveTo: null }, { effectiveTo: { gt: new Date() } }],
      },
      select: { id: true },
    });
    if (!assignment) throw new ForbiddenError("You are not assigned to this station");
    next();
  } catch (error) {
    next(error);
  }
};
