import { beforeEach, describe, expect, it, vi } from "vitest";
import { BatteryHealthSource, BatteryOperationalStatus, BatterySafetyState, SwapStatus } from "@prisma/client";

const db = vi.hoisted(() => ({
  stationAssignment: { findMany: vi.fn() },
  swapTransaction: { findUnique: vi.fn() },
  vehicleBatteryAssignment: { findFirst: vi.fn() },
  battery: { findFirst: vi.fn() },
  $transaction: vi.fn(),
}));

vi.mock("../config/database", () => ({ prisma: db }));
vi.mock("../modules/email/email.service", () => ({
  emailService: { sendBatteryInspectionCompleted: vi.fn() },
}));

import { emailService } from "../modules/email/email.service";
import { staffSwapService } from "../modules/staff-swaps/staff-swap.service";

describe("staff swap battery workflow", () => {
  const staffId = "6a53161d8786b87f8be53db2";
  const stationId = "6a551f888ea51ca3f394577f";
  const swapId = "6a551f888ea51ca3f3945799";
  const vehicleId = "6a551f888ea51ca3f3945701";
  const batteryInId = "6a551f888ea51ca3f3945702";
  const batteryOutId = "6a551f888ea51ca3f3945703";

  beforeEach(() => {
    vi.resetAllMocks();
    db.stationAssignment.findMany.mockResolvedValue([{
      stationId,
      assignmentRole: "STAFF",
      effectiveFrom: new Date(Date.now() - 60_000),
      effectiveTo: null,
      active: true,
    }]);
  });

  it("scans battery code and returns estimated health for current step", async () => {
    db.swapTransaction.findUnique.mockResolvedValue({
      id: swapId,
      stationId,
      workflowStatus: SwapStatus.VERIFIED,
      vehicleId,
      batteryInId: null,
      batteryOutId: null,
      booking: { batteryId: null },
      batteryIn: null,
      batteryOut: null,
      inspection: null,
      stepHistory: [],
    });
    db.battery.findFirst.mockResolvedValue({
      id: batteryInId,
      batteryCode: "BAT-VF8-OLD-001",
      qrCodeValue: "QR-VF8-OLD-001",
      serialNumber: "VF8-OLD-001",
      soc: 60,
      soh: 88,
      temperature: 35,
      voltage: 397,
      cycleCount: 400,
      type: "VF8-LFP-82KWH",
      batteryType: null,
      station: { id: stationId, name: "GreenCharge Quan 1" },
      operationalStatus: BatteryOperationalStatus.INSTALLED,
      safetyState: BatterySafetyState.SAFE,
      healthClassification: "LIMITED",
      healthSource: BatteryHealthSource.UNKNOWN,
      accumulatedMileageKm: 65_000,
      activatedDate: new Date("2024-01-01T00:00:00.000Z"),
      manufacturedDate: new Date("2023-10-01T00:00:00.000Z"),
      lastHealthCheckAt: null,
    });
    db.vehicleBatteryAssignment.findFirst.mockResolvedValue({ id: "assignment", vehicleId, batteryId: batteryInId, active: true });

    const result = await staffSwapService.scanBattery(swapId, staffId, "STAFF", "QR-VF8-OLD-001");
    expect(result.expectedForCurrentStep).toBe(true);
    expect(result.battery.serialNumber).toBe("VF8-OLD-001");
    expect(result.estimate.source).toBe(BatteryHealthSource.LIFECYCLE_SIMULATION);
    expect(result.estimate.estimatedSoh).toBeGreaterThanOrEqual(0);
  });

  it("allows staff inspection to override SOH after battery removal", async () => {
    db.swapTransaction.findUnique.mockResolvedValue({
      id: swapId,
      stationId,
      workflowStatus: SwapStatus.OLD_BATTERY_REMOVED,
      vehicleId,
      batteryInId,
      batteryOutId: null,
      booking: { user: { fullName: "Nguyen Van A", email: "member@batteryswap.local" }, batteryId: null },
      batteryIn: { id: batteryInId, serialNumber: "VF8-OLD-001", accumulatedMileageKm: 65_000 },
      batteryOut: null,
      inspection: null,
      stepHistory: [],
    });
    const tx = {
      battery: { update: vi.fn().mockResolvedValue({}) },
      batteryInspection: { create: vi.fn().mockResolvedValue({}) },
      swapTransaction: { update: vi.fn().mockResolvedValue({ id: swapId, workflowStatus: SwapStatus.OLD_BATTERY_INSPECTED }) },
      swapStepHistory: { create: vi.fn().mockResolvedValue({}) },
    };
    db.$transaction.mockImplementation((callback: (client: typeof tx) => unknown) => callback(tx));

    await staffSwapService.inspect(swapId, staffId, "STAFF", {
      serialNumber: "VF8-OLD-001",
      soc: 55,
      soh: 82.456,
      temperature: 39,
      voltage: 389,
      physicalCondition: "No cracks, connector clean",
      outcome: "AVAILABLE",
      notes: "AI + visual check confirmed reusable condition",
    });

    expect(tx.battery.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: batteryInId },
      data: expect.objectContaining({
        soh: 82.46,
        estimatedSoH: 82.46,
        operationalStatus: BatteryOperationalStatus.AVAILABLE,
        healthSource: BatteryHealthSource.MANUAL_INSPECTION,
      }),
    }));
    expect(emailService.sendBatteryInspectionCompleted).toHaveBeenCalled();
  });

  it("installs the assigned replacement battery successfully", async () => {
    db.swapTransaction.findUnique.mockResolvedValue({
      id: swapId,
      stationId,
      workflowStatus: SwapStatus.REPLACEMENT_ASSIGNED,
      vehicleId,
      batteryInId,
      batteryOutId,
      bookingId: "6a551f888ea51ca3f3945704",
      booking: { batteryId: batteryOutId },
      batteryIn: { id: batteryInId, serialNumber: "VF8-OLD-001" },
      batteryOut: { id: batteryOutId, serialNumber: "VF8-NEW-001", safetyState: BatterySafetyState.SAFE },
      inspection: { id: "inspection-id" },
      stepHistory: [],
    });
    const tx = {
      vehicleBatteryAssignment: { updateMany: vi.fn().mockResolvedValue({ count: 1 }), create: vi.fn().mockResolvedValue({}) },
      vehicle: { update: vi.fn().mockResolvedValue({}) },
      battery: { update: vi.fn().mockResolvedValue({}) },
      batteryReservation: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      vehicleBatteryHistory: { updateMany: vi.fn().mockResolvedValue({ count: 1 }), create: vi.fn().mockResolvedValue({}) },
      batteryLifecycleEvent: { create: vi.fn().mockResolvedValue({}) },
      swapTransaction: { update: vi.fn().mockResolvedValue({ id: swapId, workflowStatus: SwapStatus.INSTALLED }) },
      swapStepHistory: { create: vi.fn().mockResolvedValue({}) },
    };
    db.$transaction.mockImplementation((callback: (client: typeof tx) => unknown) => callback(tx));

    const result = await staffSwapService.install(swapId, staffId, "STAFF", "VF8-NEW-001");
    expect(result.workflowStatus).toBe(SwapStatus.INSTALLED);
    expect(tx.battery.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: batteryOutId },
      data: expect.objectContaining({
        operationalStatus: BatteryOperationalStatus.INSTALLED,
        currentVehicleId: vehicleId,
      }),
    }));
    expect(tx.vehicle.update).toHaveBeenCalledWith({ where: { id: vehicleId }, data: { currentBatteryId: batteryOutId, status: "ACTIVE" } });
  });
});
