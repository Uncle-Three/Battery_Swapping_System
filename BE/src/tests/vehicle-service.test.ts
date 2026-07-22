import { beforeEach, describe, expect, it, vi } from "vitest";

const { findMany, count } = vi.hoisted(() => ({
  findMany: vi.fn(),
  count: vi.fn(),
}));

vi.mock("../config/database", () => ({
  prisma: {
    vehicle: { findMany, count },
  },
}));

import { getMyVehicles } from "../modules/vehicles/vehicle.service";

describe("vehicle list service", () => {
  beforeEach(() => {
    findMany.mockReset().mockResolvedValue([]);
    count.mockReset().mockResolvedValue(0);
  });

  it("applies battery filters and the requested sort to both list and count", async () => {
    await getMyVehicles("user-id", {
      page: 1,
      size: 20,
      sort: "plateNumber,asc",
      batteryStatus: "READY",
      healthClassification: "HEALTHY",
    });

    const expectedWhere = {
      userId: "user-id",
      isDeleted: false,
      batteryAssignments: {
        some: {
          active: true,
          battery: { is: { status: "READY", healthClassification: "HEALTHY" } },
        },
      },
    };

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expectedWhere,
      skip: 20,
      take: 20,
      orderBy: { plateNumber: "asc" },
    }));
    expect(count).toHaveBeenCalledWith({ where: expectedWhere });
  });
});
