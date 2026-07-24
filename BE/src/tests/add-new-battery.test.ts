import { describe, expect, it, vi } from "vitest";
import { createBatterySchema } from "../modules/batteries/battery.validation";
import { batteryService } from "../modules/batteries/battery.service";
import { batteryRepository } from "../modules/batteries/battery.repository";
import { ConflictError } from "../common/errors/conflict-error";
import { ForbiddenError } from "../common/errors/forbidden-error";
import { BadRequestError } from "../common/errors/bad-request-error";

const mockStationId = "6a551f888ea51ca3f394577f";
const mockBatteryTypeId = "6a551f888ea51ca3f394577e";

describe("Add New Battery - Validation Schema", () => {
  it("normalizes code and serialNumber to uppercase and trims whitespace", () => {
    const parsed = createBatterySchema.parse({
      code: "  bat-vf8-0001  ",
      serialNumber: "  vf8-2026-bat-000001  ",
      batteryTypeId: mockBatteryTypeId,
      manufacturer: "VinES",
      ratedCapacityAh: 100,
      ratedVoltage: 400,
      soc: 95,
      manufacturedAt: "2026-07-01",
      receivedAt: "2026-07-24",
      stationId: mockStationId,
      storageLocation: "Kệ A - Ô 01",
      note: "  Pin mới  ",
    });

    expect(parsed.code).toBe("BAT-VF8-0001");
    expect(parsed.serialNumber).toBe("VF8-2026-BAT-000001");
    expect(parsed.note).toBe("Pin mới");
  });

  it("rejects SOC out of bounds (0-100)", () => {
    const invalid = createBatterySchema.safeParse({
      code: "BAT-001",
      serialNumber: "SN-001",
      batteryTypeId: mockBatteryTypeId,
      manufacturer: "VinES",
      ratedCapacityAh: 100,
      ratedVoltage: 400,
      soc: 150,
      manufacturedAt: "2026-07-01",
      receivedAt: "2026-07-24",
      stationId: mockStationId,
      storageLocation: "Kệ A - Ô 01",
    });

    expect(invalid.success).toBe(false);
  });

  it("rejects receivedAt earlier than manufacturedAt", () => {
    const invalid = createBatterySchema.safeParse({
      code: "BAT-001",
      serialNumber: "SN-001",
      batteryTypeId: mockBatteryTypeId,
      manufacturer: "VinES",
      ratedCapacityAh: 100,
      ratedVoltage: 400,
      soc: 90,
      manufacturedAt: "2026-07-24",
      receivedAt: "2026-07-01",
      stationId: mockStationId,
      storageLocation: "Kệ A - Ô 01",
    });

    expect(invalid.success).toBe(false);
  });

  it("rejects negative or zero rated capacity / voltage", () => {
    const invalidCap = createBatterySchema.safeParse({
      code: "BAT-001",
      serialNumber: "SN-001",
      batteryTypeId: mockBatteryTypeId,
      manufacturer: "VinES",
      ratedCapacityAh: 0,
      ratedVoltage: 400,
      soc: 90,
      manufacturedAt: "2026-07-01",
      receivedAt: "2026-07-24",
      stationId: mockStationId,
      storageLocation: "Kệ A - Ô 01",
    });

    expect(invalidCap.success).toBe(false);
  });
});

describe("Add New Battery - Service Logic", () => {
  it("throws ConflictError (409) if code or serial number already exists", async () => {
    vi.spyOn(batteryRepository, "findByCodeOrSerialNumber").mockResolvedValueOnce({
      id: "existing-id",
    } as never);

    await expect(
      batteryService.createBattery("user-1", "STAFF", {
        code: "BAT-VF8-0001",
        serialNumber: "VF8-2026-BAT-000001",
        batteryTypeId: mockBatteryTypeId,
        manufacturer: "VinES",
        ratedCapacityAh: 100,
        ratedVoltage: 400,
        soc: 95,
        manufacturedAt: new Date("2026-07-01"),
        receivedAt: new Date("2026-07-24"),
        stationId: mockStationId,
        storageLocation: "Kệ A - Ô 01",
        note: undefined,
      })
    ).rejects.toThrow(ConflictError);
  });

  it("throws ForbiddenError (403) if staff is not authorized for the station", async () => {
    vi.spyOn(batteryRepository, "findByCodeOrSerialNumber").mockResolvedValueOnce(null);
    vi.spyOn(batteryRepository, "findBatteryTypeById").mockResolvedValueOnce({ id: mockBatteryTypeId } as never);
    vi.spyOn(batteryRepository, "findStationById").mockResolvedValueOnce({ id: mockStationId } as never);
    vi.spyOn(batteryRepository, "checkUserStationAuthorization").mockResolvedValueOnce(false);

    await expect(
      batteryService.createBattery("user-staff-unauth", "STAFF", {
        code: "BAT-VF8-0002",
        serialNumber: "VF8-2026-BAT-000002",
        batteryTypeId: mockBatteryTypeId,
        manufacturer: "VinES",
        ratedCapacityAh: 100,
        ratedVoltage: 400,
        soc: 95,
        manufacturedAt: new Date("2026-07-01"),
        receivedAt: new Date("2026-07-24"),
        stationId: mockStationId,
        storageLocation: "Kệ A - Ô 01",
        note: undefined,
      })
    ).rejects.toThrow(ForbiddenError);
  });

  it("enforces mandatory system defaults (SOH=100, cycleCount=0, distance=0, condition=NEW, status=AVAILABLE)", async () => {
    vi.spyOn(batteryRepository, "findByCodeOrSerialNumber").mockResolvedValueOnce(null);
    vi.spyOn(batteryRepository, "findBatteryTypeById").mockResolvedValueOnce({ id: mockBatteryTypeId } as never);
    vi.spyOn(batteryRepository, "findStationById").mockResolvedValueOnce({ id: mockStationId } as never);
    vi.spyOn(batteryRepository, "checkUserStationAuthorization").mockResolvedValueOnce(true);
    vi.spyOn(batteryRepository, "checkStorageLocationConflict").mockResolvedValueOnce(null);
    vi.spyOn(batteryRepository, "createBatteryWithTransaction").mockResolvedValueOnce({
      id: "new-battery-id",
      batteryCode: "BAT-VF8-0003",
      serialNumber: "VF8-2026-BAT-000003",
      batteryTypeId: mockBatteryTypeId,
      manufacturer: "VinES",
      ratedCapacityAh: 100,
      ratedVoltage: 400,
      soc: 95,
      soh: 100,
      cycleCount: 0,
      accumulatedMileageKm: 0,
      condition: "NEW",
      operationalStatus: "AVAILABLE",
      stationId: mockStationId,
      storageLocation: "Kệ A - Ô 01",
      manufacturedAt: new Date("2026-07-01"),
      receivedAt: new Date("2026-07-24"),
      note: "Pin mới",
      createdAt: new Date(),
    } as never);

    const result = await batteryService.createBattery("user-staff", "STAFF", {
      code: "BAT-VF8-0003",
      serialNumber: "VF8-2026-BAT-000003",
      batteryTypeId: mockBatteryTypeId,
      manufacturer: "VinES",
      ratedCapacityAh: 100,
      ratedVoltage: 400,
      soc: 95,
      manufacturedAt: new Date("2026-07-01"),
      receivedAt: new Date("2026-07-24"),
      stationId: mockStationId,
      storageLocation: "Kệ A - Ô 01",
      note: "Pin mới",
    });

    expect(result.soh).toBe(100);
    expect(result.cycleCount).toBe(0);
    expect(result.accumulatedDistance).toBe(0);
    expect(result.condition).toBe("NEW");
    expect(result.status).toBe("AVAILABLE");
    expect(result.code).toBe("BAT-VF8-0003");
  });
});
