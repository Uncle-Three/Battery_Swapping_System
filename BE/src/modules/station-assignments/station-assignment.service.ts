import { RoleName, StationAssignmentRole } from "@prisma/client";
import { BadRequestError } from "../../common/errors/bad-request-error";
import { NotFoundError } from "../../common/errors/not-found-error";
import { stationAssignmentRepository } from "./station-assignment.repository";

type CreateAssignmentInput = {
  userId: string;
  stationId: string;
  assignmentRole: StationAssignmentRole;
  shift?: string;
  effectiveFrom?: Date;
  effectiveTo?: Date;
};

const expectedRole: Record<StationAssignmentRole, RoleName> = {
  STAFF: RoleName.STAFF,
  TECHNICIAN: RoleName.TECHNICIAN,
  MANAGER: RoleName.MANAGER,
};

export const stationAssignmentService = {
  list: () => stationAssignmentRepository.findMany(),
  create: async (input: CreateAssignmentInput) => {
    const [user, station] = await Promise.all([
      stationAssignmentRepository.findUser(input.userId),
      stationAssignmentRepository.findStation(input.stationId),
    ]);
    if (!user) throw new NotFoundError("User not found");
    if (!station) throw new NotFoundError("Station not found");
    if (user.role.name !== expectedRole[input.assignmentRole] && user.role.name !== RoleName.ADMIN) {
      throw new BadRequestError(`User role must be ${expectedRole[input.assignmentRole]}`);
    }
    if (input.assignmentRole === StationAssignmentRole.STAFF) {
      await stationAssignmentRepository.deactivateOthers(input.userId, input.assignmentRole, input.stationId);
    }
    const existing = await stationAssignmentRepository.findExisting(input.userId, input.stationId, input.assignmentRole);
    if (existing) return stationAssignmentRepository.reactivate(existing.id, input.effectiveFrom ?? new Date(), input.effectiveTo, input.shift);
    return stationAssignmentRepository.create({
      ...input,
      effectiveFrom: input.effectiveFrom ?? new Date(),
    });
  },
  deactivate: (id: string) => stationAssignmentRepository.deactivate(id),
};
