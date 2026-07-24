import { describe, it, expect, vi, beforeEach } from "vitest";

const db = vi.hoisted(() => ({
  swapTransaction: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  battery: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  batteryType: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
  },
  vehicle: {
    update: vi.fn(),
  },
  station: {
    findFirst: vi.fn(),
  },
  stationAssignment: {
    findFirst: vi.fn(),
  },
  batteryCompatibility: {
    findFirst: vi.fn(),
  },
  batteryMovement: {
    create: vi.fn(),
  },
  auditLog: {
    create: vi.fn(),
  },
  swapStepHistory: {
    create: vi.fn(),
  },
  notification: {
    create: vi.fn(),
  },
  $transaction: vi.fn((cb: any) => cb(db)),
}));

vi.mock("../config/database", () => ({ prisma: db }));

import { replacementAllocationService } from "../modules/replacement-allocation/replacement-allocation.service";

describe("Step 3: Replacement Battery Allocation Workflow", () => {
  const swapId = "6a551f888ea51ca3f3945799";
  const staffId = "65f1a2b3c4d5e6f7a8b9c0d1";
  const stationId = "65f1a2b3c4d5e6f7a8b9c0d2";
  const batteryTypeId = "65f1a2b3c4d5e6f7a8b9c0d3";
  const batteryId1 = "65f1a2b3c4d5e6f7a8b9c0d4";
  const vehicleId = "65f1a2b3c4d5e6f7a8b9c0d8";

  const mockSwap = {
    id: swapId,
    stationId,
    vehicleId,
    workflowStatus: "OLD_BATTERY_REMOVED",
    batteryIn: {
      id: "65f1a2b3c4d5e6f7a8b9c0d9",
      batteryTypeId,
      batteryType: { id: batteryTypeId, code: "VF3_LFP_18" },
    },
    batteryOut: null,
    station: { id: stationId, name: "Trạm HCM 01" },
    vehicle: { id: "vehicle-vf3-01", currentBatteryId: "battery-old-01" },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    db.stationAssignment.findFirst.mockResolvedValue({ id: "assign-1", active: true });
    db.swapTransaction.findFirst.mockResolvedValue(mockSwap);
  });

  it("1. Candidate filtering tests: returns only brand-new batteries with SOH 100%, AVAILABLE status, and SOC >= 80%", async () => {
    const mockBatteries = [
      {
        id: "bat-1",
        batteryCode: "BAT-HCM-2026-000001",
        serialNumber: "VF3-001",
        soh: 100,
        soc: 95,
        condition: "NEW",
        operationalStatus: "AVAILABLE",
        stationId,
        batteryTypeId,
        currentVehicleId: null,
        reservedForSwapId: null,
        storageLocation: "Kệ A - Ô 01",
        receivedAt: new Date("2026-07-20"),
        createdAt: new Date("2026-07-20"),
        batteryType: { code: "VF3_LFP_18" },
      },
      {
        id: "bat-2", // Fail: SOH < 100%
        batteryCode: "BAT-HCM-2026-000002",
        serialNumber: "VF3-002",
        soh: 98,
        soc: 90,
        condition: "NEW",
        operationalStatus: "AVAILABLE",
        stationId,
        batteryTypeId,
        currentVehicleId: null,
        reservedForSwapId: null,
      },
      {
        id: "bat-3", // Fail: SOC < 80%
        batteryCode: "BAT-HCM-2026-000003",
        serialNumber: "VF3-003",
        soh: 100,
        soc: 75,
        condition: "NEW",
        operationalStatus: "AVAILABLE",
        stationId,
        batteryTypeId,
        currentVehicleId: null,
        reservedForSwapId: null,
      },
      {
        id: "bat-4", // Fail: RESERVED
        batteryCode: "BAT-HCM-2026-000004",
        serialNumber: "VF3-004",
        soh: 100,
        soc: 99,
        condition: "NEW",
        operationalStatus: "RESERVED",
        stationId,
        batteryTypeId,
        currentVehicleId: null,
        reservedForSwapId: "other-swap",
      },
    ];

    db.battery.findMany.mockResolvedValue(mockBatteries);

    const result = await replacementAllocationService.getCandidates(swapId, staffId, "STAFF");

    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0].id).toBe("bat-1");
    expect(result.recommendedBattery?.id).toBe("bat-1");
    expect(result.stats.totalSameType).toBe(4);
  });

  it("2. Battery reservation concurrency test: handles concurrent reservation failure gracefully (409 Conflict)", async () => {
    db.battery.findFirst.mockResolvedValue({ id: "bat-1", stationId: "st-1", batteryTypeId: "65f1a2b3c4d5e6f7a8b9c0d3" } as any);
    db.battery.updateMany.mockResolvedValue({ count: 0 }); // Concurrency conflict simulation

    await expect(
      replacementAllocationService.reserve(swapId, "bat-1", staffId, "STAFF")
    ).rejects.toThrow("Pin này vừa được giữ bởi một giao dịch khác. Vui lòng chọn pin khác.");
  });

  it("3. Successful reservation records the REPLACEMENT_ASSIGNED timeline step", async () => {
    db.battery.findFirst.mockResolvedValue({
      id: "bat-1",
      batteryCode: "BAT-HCM-2026-000021",
      serialNumber: "VF3-2026-000021",
      stationId,
      batteryTypeId,
    } as any);
    db.battery.updateMany.mockResolvedValue({ count: 1 });
    db.swapTransaction.update.mockResolvedValue({
      ...mockSwap,
      batteryOutId: "bat-1",
      workflowStatus: "REPLACEMENT_ASSIGNED",
    });

    await replacementAllocationService.reserve(swapId, "bat-1", staffId, "STAFF");

    expect(db.swapStepHistory.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        swapTransactionId: swapId,
        actorId: staffId,
        fromStatus: "OLD_BATTERY_REMOVED",
        toStatus: "REPLACEMENT_ASSIGNED",
        data: expect.objectContaining({
          action: "ASSIGN_REPLACEMENT",
          batteryCode: "BAT-HCM-2026-000021",
        }),
      }),
    }));
  });

  it("4. Wrong QR verification test: rejects wrong scanned battery QR code", async () => {
    const swapWithReserved = {
      ...mockSwap,
      batteryOutId: "bat-1",
      batteryOut: {
        id: "bat-1",
        batteryCode: "BAT-HCM-2026-000021",
        serialNumber: "VF3-2026-000021",
        storageLocation: "Kệ A - Ô 05",
        operationalStatus: "RESERVED",
      },
    };
    db.swapTransaction.findFirst.mockResolvedValue(swapWithReserved);

    await expect(
      replacementAllocationService.verifyQr(swapId, "WRONG-BATTERY-CODE", staffId, "STAFF")
    ).rejects.toThrow("Pin vừa quét không phải pin đã được giữ cho giao dịch này. Vui lòng lấy đúng pin BAT-HCM-2026-000021 tại Kệ A - Ô 05.");
  });

  it("5. Correct QR verification test: accepts exact reserved battery code/serial", async () => {
    const swapWithReserved = {
      ...mockSwap,
      batteryOutId: "bat-1",
      batteryOut: {
        id: "bat-1",
        batteryCode: "BAT-HCM-2026-000021",
        serialNumber: "VF3-2026-000021",
        storageLocation: "Kệ A - Ô 05",
        operationalStatus: "RESERVED",
      },
    };
    db.swapTransaction.findFirst.mockResolvedValue(swapWithReserved);

    const result = await replacementAllocationService.verifyQr(swapId, "BAT-HCM-2026-000021", staffId, "STAFF");
    expect(result.success).toBe(true);
    expect(result.data.verified).toBe(true);
  });

  it("6. Reservation cancellation test: releases battery to AVAILABLE and resets swap status", async () => {
    const swapWithReserved = {
      ...mockSwap,
      batteryOutId: "bat-1",
      workflowStatus: "REPLACEMENT_ASSIGNED",
      batteryOut: { id: "bat-1" },
    };
    db.swapTransaction.findFirst.mockResolvedValue(swapWithReserved);
    db.battery.update.mockResolvedValue({});
    db.swapTransaction.update.mockResolvedValue({ ...swapWithReserved, batteryOutId: null, workflowStatus: "OLD_BATTERY_REMOVED" });

    const result = await replacementAllocationService.cancelReservation(swapId, staffId, "STAFF");

    expect(db.battery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "bat-1" },
        data: expect.objectContaining({ operationalStatus: "AVAILABLE", reservedForSwapId: null }),
      })
    );
    expect(result.workflowStatus).toBe("OLD_BATTERY_REMOVED");
  });

  it("7. Successful installation test: updates battery, vehicle, transaction, and movement records atomically", async () => {
    const swapWithReserved = {
      ...mockSwap,
      batteryInId: "bat-old-1",
      batteryOutId: "bat-new-1",
      vehicleId: "vehicle-1",
      workflowStatus: "REPLACEMENT_ASSIGNED",
      batteryOut: { id: "bat-new-1", batteryCode: "BAT-NEW-01", soc: 98, condition: "NEW", storageLocation: "Kệ A - Ô 05" },
    };

    db.swapTransaction.findFirst.mockResolvedValue(swapWithReserved);
    db.battery.update.mockResolvedValue({ id: "bat-new-1", operationalStatus: "INSTALLED" });
    db.vehicle.update.mockResolvedValue({});
    db.swapTransaction.update.mockResolvedValue({ ...swapWithReserved, workflowStatus: "INSTALLED" });
    db.batteryMovement.create.mockResolvedValue({});

    const result = await replacementAllocationService.install(swapId, staffId, "STAFF");

    expect(db.battery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "bat-new-1" },
        data: expect.objectContaining({ operationalStatus: "INSTALLED", currentVehicleId: "vehicle-1" }),
      })
    );
    expect(db.vehicle.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "vehicle-1" },
        data: expect.objectContaining({ currentBatteryId: "bat-new-1" }),
      })
    );
    expect(db.batteryMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ batteryId: "bat-new-1", movementType: "INSTALLED_TO_VEHICLE" }),
      })
    );
    expect(result.workflowStatus).toBe("INSTALLED");
    expect(db.swapStepHistory.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        swapTransactionId: swapId,
        actorId: staffId,
        fromStatus: "REPLACEMENT_ASSIGNED",
        toStatus: "INSTALLED",
      }),
    }));
  });

  it("8. Unauthorized station access test: blocks unauthorized staff from accessing other stations", async () => {
    db.stationAssignment.findFirst.mockResolvedValue(null);

    await expect(
      replacementAllocationService.getCandidates(swapId, staffId, "STAFF")
    ).rejects.toThrow("Bạn không có quyền thực hiện thao tác này tại trạm.");
  });

  it("9. No available battery test: returns empty candidates and accurate stats breakdown", async () => {
    db.battery.findMany.mockResolvedValue([]);

    const result = await replacementAllocationService.getCandidates(swapId, staffId, "STAFF");

    expect(result.candidates).toHaveLength(0);
    expect(result.recommendedBattery).toBeNull();
    expect(result.stats).toEqual({
      totalSameType: 0,
      reservedCount: 0,
      lowSocCount: 0,
      inUseCount: 0,
    });
  });
});
