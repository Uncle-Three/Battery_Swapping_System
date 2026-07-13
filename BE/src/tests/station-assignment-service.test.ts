import { beforeEach, describe, expect, it, vi } from "vitest";
import { RoleName, StationAssignmentRole } from "@prisma/client";

const repository = vi.hoisted(() => ({
  findMany: vi.fn(), findUser: vi.fn(), findStation: vi.fn(), findExisting: vi.fn(),
  deactivateOthers: vi.fn(), create: vi.fn(), reactivate: vi.fn(), deactivate: vi.fn(),
}));
vi.mock("../modules/station-assignments/station-assignment.repository", () => ({ stationAssignmentRepository: repository }));

import { stationAssignmentService } from "../modules/station-assignments/station-assignment.service";

describe("single current station assignment for staff", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    repository.findUser.mockResolvedValue({ id: "user", role: { name: RoleName.STAFF } });
    repository.findStation.mockResolvedValue({ id: "station-new" });
    repository.findExisting.mockResolvedValue(null);
    repository.deactivateOthers.mockResolvedValue({ count: 1 });
    repository.create.mockResolvedValue({ id: "assignment-new" });
  });

  it("ends other active staff assignments when admin moves staff to a new station", async () => {
    await stationAssignmentService.create({
      userId: "user", stationId: "station-new", assignmentRole: StationAssignmentRole.STAFF, shift: "Ca sáng",
    });
    expect(repository.deactivateOthers).toHaveBeenCalledWith("user", StationAssignmentRole.STAFF, "station-new");
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ stationId: "station-new", shift: "Ca sáng" }));
  });

  it("does not collapse manager assignments because managers may oversee multiple stations", async () => {
    repository.findUser.mockResolvedValue({ id: "manager", role: { name: RoleName.MANAGER } });
    await stationAssignmentService.create({ userId: "manager", stationId: "station-new", assignmentRole: StationAssignmentRole.MANAGER });
    expect(repository.deactivateOthers).not.toHaveBeenCalled();
  });
});
