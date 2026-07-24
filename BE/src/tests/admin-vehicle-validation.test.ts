import { describe, expect, it } from "vitest";
import { adminVehicleListQuerySchema, lockVehicleSchema, reasonSchema } from "../modules/admin-vehicles/admin-vehicle.validation";

describe("Admin vehicle validation", () => {
  it("uses one-based server pagination defaults", () => {
    const value = adminVehicleListQuerySchema.parse({});
    expect(value.page).toBe(1);
    expect(value.limit).toBe(10);
    expect(value.sortBy).toBe("createdAt");
    expect(value.sortOrder).toBe("desc");
  });

  it("accepts all supported filters", () => {
    const value = adminVehicleListQuerySchema.parse({ status: "LOCKED", batterySafety: "UNSAFE", transferStatus: "UNDER_REVIEW", minSoh: "50", maxSoh: "80", limit: "20" });
    expect(value).toMatchObject({ status: "LOCKED", batterySafety: "UNSAFE", transferStatus: "UNDER_REVIEW", minSoh: 50, maxSoh: 80, limit: 20 });
  });

  it("rejects invalid ranges and pagination limits", () => {
    expect(adminVehicleListQuerySchema.safeParse({ minSoh: 90, maxSoh: 20 }).success).toBe(false);
    expect(adminVehicleListQuerySchema.safeParse({ limit: 15 }).success).toBe(false);
  });

  it("requires a meaningful lock reason", () => {
    expect(lockVehicleSchema.safeParse({ category: "SAFETY_RISK", reason: "" }).success).toBe(false);
    expect(lockVehicleSchema.safeParse({ category: "SAFETY_RISK", reason: "Pin có dấu hiệu quá nhiệt" }).success).toBe(true);
    expect(reasonSchema.safeParse({ reason: "abc" }).success).toBe(false);
  });
});
