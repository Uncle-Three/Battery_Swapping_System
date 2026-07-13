import { describe, expect, it } from "vitest";
import {
  createVehicleSchema,
  vehicleHistoryQuerySchema,
  vehicleIdParamsSchema,
  vehicleListQuerySchema,
} from "../modules/vehicles/vehicle.schema";

describe("vehicle request validation", () => {
  it("parses safe pagination defaults and supported filters", () => {
    expect(vehicleListQuerySchema.parse({ batteryStatus: "READY", healthClassification: "HEALTHY" })).toEqual({
      page: 0,
      size: 12,
      sort: "createdAt,desc",
      batteryStatus: "READY",
      healthClassification: "HEALTHY",
    });
  });

  it("rejects invalid pagination, sort values, and vehicle ids", () => {
    expect(() => vehicleListQuerySchema.parse({ page: -1 })).toThrow();
    expect(() => vehicleHistoryQuerySchema.parse({ size: 101 })).toThrow();
    expect(() => vehicleListQuerySchema.parse({ sort: "userId,asc" })).toThrow();
    expect(() => vehicleIdParamsSchema.parse({ vehicleId: "not-an-object-id" })).toThrow();
  });

  it("rejects invalid dates and unknown create fields", () => {
    const validVehicle = {
      plateNumber: "51A-12345",
      brand: "VinFast",
      model: "VF 8",
      manufactureYear: 2025,
      purchaseDate: "2025-01-15",
      currentMileageKm: 100,
      batteryType: "LITHIUM_ION",
      batteryOwnershipType: "OWNED" as const,
      qrCodeValue: "VINFAST-BATTERY-QR-001",
    };

    expect(createVehicleSchema.body.parse(validVehicle).purchaseDate).toBeInstanceOf(Date);
    expect(() => createVehicleSchema.body.parse({ ...validVehicle, purchaseDate: "invalid-date" })).toThrow();
    expect(() => createVehicleSchema.body.parse({ ...validVehicle, unexpected: true })).toThrow();
  });
});
