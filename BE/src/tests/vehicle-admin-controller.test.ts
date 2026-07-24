import { describe, expect, it, vi } from "vitest";

const getAllVehicles = vi.hoisted(() => vi.fn());

vi.mock("../modules/vehicles/vehicle.service", () => ({ getAllVehicles }));

import { listAllForAdmin } from "../modules/vehicles/vehicle.controller";

describe("admin vehicle controller", () => {
  it("wraps the paginated vehicle list in the standard API envelope", async () => {
    const page = { content: [{ id: "vehicle-1" }], totalElements: 1, totalPages: 1 };
    getAllVehicles.mockResolvedValueOnce(page);
    const json = vi.fn();
    const next = vi.fn();

    await listAllForAdmin(
      { query: { page: 0, size: 20, sort: "createdAt,desc" } } as any,
      { json } as any,
      next,
    );

    expect(json).toHaveBeenCalledWith({ success: true, data: page });
    expect(next).not.toHaveBeenCalled();
  });
});
