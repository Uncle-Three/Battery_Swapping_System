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

import { getAllVehicles, getMyVehicles } from "../modules/vehicles/vehicle.service";

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

  it("lists vehicles across every user for admins and includes owner details", async () => {
    findMany.mockResolvedValueOnce([{
      id: "vehicle-1", userId: "user-1", name: "VF 8", plateNumber: "51A-12345",
      vinNumber: "VIN001", brand: "VinFast", model: "VF 8", manufactureYear: 2025,
      currentMileageKm: 100, batteryType: "LITHIUM_ION", status: "ACTIVE",
      ownershipStatus: "ACTIVE", vehicleImageUrl: null, createdAt: new Date(), updatedAt: new Date(),
      user: { id: "user-1", fullName: "Nguyễn Văn A", email: "a@example.com", phone: "0900000000" },
    }]);
    count.mockResolvedValueOnce(1);

    const result = await getAllVehicles({ page: 0, size: 20, sort: "createdAt,desc", search: "Nguyễn" });

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.not.objectContaining({ userId: expect.anything() }),
      include: { user: { select: { id: true, fullName: true, email: true, phone: true } } },
    }));
    expect(result.content[0].user).toEqual(expect.objectContaining({ name: "Nguyễn Văn A", email: "a@example.com" }));
    expect(result.totalElements).toBe(1);
  });
});
