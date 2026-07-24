import { describe, expect, it } from "vitest";
import { adminSwapListQuerySchema } from "../modules/admin-swap-transactions/admin-swap-transaction.validation";

describe("Admin swap transaction filters", () => {
  it("uses safe pagination defaults", () => {
    expect(adminSwapListQuerySchema.parse({})).toMatchObject({ page: 1, limit: 20 });
  });

  it("accepts normalized workflow and operational filters", () => {
    const result = adminSwapListQuerySchema.parse({ status: "NEW_BATTERY_INSTALLED", paymentStatus: "REFUNDED", minOldSoh: "60", maxOldSoh: "90", hasTechnicalError: "true" });
    expect(result).toMatchObject({ status: "NEW_BATTERY_INSTALLED", paymentStatus: "REFUNDED", minOldSoh: 60, maxOldSoh: 90, hasTechnicalError: true });
  });

  it("rejects an invalid SoH range", () => {
    expect(adminSwapListQuerySchema.safeParse({ minOldSoh: 90, maxOldSoh: 60 }).success).toBe(false);
  });
});
