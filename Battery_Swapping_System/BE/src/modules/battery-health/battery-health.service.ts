import {
  BatteryOperationalStatus,
  BatterySafetyState,
  NotificationType,
  Prisma,
  ReplacementRequestStatus,
  RoleName,
  StationAssignmentRole,
  VehicleStatus,
} from "@prisma/client";
import { prisma } from "../../config/database";
import { ForbiddenError } from "../../common/errors/forbidden-error";
import { NotFoundError } from "../../common/errors/not-found-error";
import type { BatteryTelemetryInput } from "./battery-health.validation";
import { assertBatterySafetyTransition } from "../../common/state-machines/transitions";
import { calculateBatterySoh, inferAccumulatedMileageKm } from "./battery-soh";

type Actor = { id: string; role: RoleName };

const ruleSnapshot = (rule: {
  minimumSohSafe: number; minimumSohWarning: number; minimumSoc: number;
  maximumTemperature: number; minimumVoltage: number; maximumVoltage: number;
}) => ({
  minimumSohSafe: rule.minimumSohSafe,
  minimumSohWarning: rule.minimumSohWarning,
  minimumSoc: rule.minimumSoc,
  maximumTemperature: rule.maximumTemperature,
  minimumVoltage: rule.minimumVoltage,
  maximumVoltage: rule.maximumVoltage,
});

export const evaluateBatterySafety = (input: BatteryTelemetryInput, rule: ReturnType<typeof ruleSnapshot>): BatterySafetyState => {
  if (input.soh < rule.minimumSohWarning || input.temperature > rule.maximumTemperature ||
      input.voltage < rule.minimumVoltage || input.voltage > rule.maximumVoltage) return BatterySafetyState.UNSAFE;
  if (input.soh < rule.minimumSohSafe || input.soc < rule.minimumSoc ||
      input.temperature >= rule.maximumTemperature * 0.9) return BatterySafetyState.WARNING;
  return BatterySafetyState.SAFE;
};

const assertAccess = async (actor: Actor, battery: { stationId: string | null; vehicleAssignments: Array<{ vehicle: { userId: string } }> }, write: boolean) => {
  if (actor.role === RoleName.ADMIN) return;
  if (actor.role === RoleName.MEMBER) {
    if (write || !battery.vehicleAssignments.some((assignment) => assignment.vehicle.userId === actor.id)) {
      throw new ForbiddenError("You cannot access this battery");
    }
    return;
  }
  const allowedRoles = write
    ? [StationAssignmentRole.TECHNICIAN]
    : [StationAssignmentRole.TECHNICIAN, StationAssignmentRole.MANAGER];
  if (!battery.stationId) throw new ForbiddenError("Battery has no station context");
  const assignment = await prisma.stationAssignment.findFirst({
    where: { userId: actor.id, stationId: battery.stationId, assignmentRole: { in: allowedRoles }, active: true },
    select: { id: true },
  });
  if (!assignment) throw new ForbiddenError("You are not assigned to this battery station");
};

const loadBattery = (id: string) => prisma.battery.findUnique({
  where: { id },
  include: { vehicleAssignments: { where: { active: true }, include: { vehicle: { select: { id: true, userId: true } } } } },
});

export const batteryHealthService = {
  recordTelemetry: async (batteryId: string, input: BatteryTelemetryInput, actor: Actor) => {
    const battery = await loadBattery(batteryId);
    if (!battery) throw new NotFoundError("Battery not found");
    await assertAccess(actor, battery, true);

    // SOH is derived from the battery's accumulated mileage. Incoming BMS SOH
    // is intentionally not authoritative for this project model.
    const accumulatedMileageKm = inferAccumulatedMileageKm(battery.accumulatedMileageKm, battery.soh);
    const measurements = { ...input, soh: calculateBatterySoh(accumulatedMileageKm) };

    const now = input.recordedAt ?? new Date();
    const rule = await prisma.batterySafetyRule.findFirst({
      where: {
        active: true,
        effectiveFrom: { lte: now },
        AND: [{ OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }] }],
        OR: [{ stationId: battery.stationId }, { stationId: null }],
      },
      orderBy: [{ stationId: "desc" }, { version: "desc" }],
    });
    if (!rule) throw new NotFoundError("No active battery safety rule configured");
    const snapshot = ruleSnapshot(rule);
    const safetyState = evaluateBatterySafety(measurements, snapshot);
    if (safetyState !== battery.safetyState) assertBatterySafetyTransition(battery.safetyState, safetyState);

    return prisma.$transaction(async (tx) => {
      const healthLog = await tx.batteryHealthLog.create({ data: {
        batteryId, ...measurements, recordedAt: now, safetyState, ruleVersion: rule.version,
        ruleSnapshot: snapshot,
      } });
      await tx.battery.update({ where: { id: batteryId }, data: {
        soc: measurements.soc, soh: measurements.soh, estimatedSoH: measurements.soh,
        accumulatedMileageKm, cycleCount: measurements.cycleCount,
        temperature: measurements.temperature, voltage: measurements.voltage, safetyState,
        lastHealthCheckAt: now, lastUpdated: now,
      } });

      let replacementRequestId: string | null = null;
      if (safetyState === BatterySafetyState.UNSAFE && battery.vehicleAssignments[0]) {
        const assignment = battery.vehicleAssignments[0];
        await tx.vehicle.update({ where: { id: assignment.vehicle.id }, data: { status: VehicleStatus.INACTIVE } });
        const deduplicationKey = `mandatory:${batteryId}`;
        let request = await tx.replacementRequest.findFirst({
          where: { deduplicationKey, status: { notIn: [ReplacementRequestStatus.CANCELLED, ReplacementRequestStatus.COMPLETED] } },
        });
        if (!request) {
          try {
            request = await tx.replacementRequest.create({ data: {
              vehicleId: assignment.vehicle.id, batteryId, mandatory: true, priority: 100,
              reason: "Battery telemetry is below the configured safety threshold",
              safetySnapshot: { measurements, ruleVersion: rule.version, rule: snapshot },
              status: ReplacementRequestStatus.USER_NOTIFIED, deduplicationKey,
            } });
            await tx.notification.create({ data: {
              userId: assignment.vehicle.userId, type: NotificationType.MANDATORY_REPLACEMENT,
              title: "Battery replacement required",
              message: "Your vehicle battery is unsafe. The vehicle is blocked until a mandatory replacement is completed.",
              entityType: "ReplacementRequest", entityId: request.id,
              metadata: { batteryId, safetyState, priority: 100 },
            } });
          } catch (error) {
            if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) throw error;
            request = await tx.replacementRequest.findFirst({ where: { deduplicationKey } });
          }
        }
        replacementRequestId = request?.id ?? null;
      } else if (safetyState === BatterySafetyState.WARNING && battery.vehicleAssignments[0]) {
        await tx.notification.create({ data: {
          userId: battery.vehicleAssignments[0].vehicle.userId,
          type: NotificationType.BATTERY_WARNING,
          title: "Battery health warning",
          message: "Your vehicle battery needs closer monitoring. Consider scheduling a replacement.",
          entityType: "Battery", entityId: batteryId,
          metadata: { safetyState, ruleVersion: rule.version },
        } });
      }
      await tx.auditLog.create({ data: {
        adminId: actor.id, actorRole: actor.role, stationId: battery.stationId,
        entityType: "Battery", entityId: batteryId, action: "BATTERY_TELEMETRY_EVALUATED",
        after: { safetyState, measurements, ruleVersion: rule.version },
      } });
      return { healthLog, safetyState, replacementRequestId };
    });
  },

  getHealth: async (batteryId: string, actor: Actor) => {
    const battery = await loadBattery(batteryId);
    if (!battery) throw new NotFoundError("Battery not found");
    await assertAccess(actor, battery, false);
    const logs = await prisma.batteryHealthLog.findMany({ where: { batteryId }, orderBy: { recordedAt: "desc" }, take: 50 });
    return { battery, logs };
  },
};
