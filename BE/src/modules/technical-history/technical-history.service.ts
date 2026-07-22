import { prisma } from "../../config/database";
import { NotFoundError } from "../../common/errors/not-found-error";
import { ForbiddenError } from "../../common/errors/forbidden-error";

/**
 * Sanitized swap transaction record - excludes all payment/billing data
 */
export type SanitizedSwapRecord = {
  id: string;
  stationId: string;
  batteryInSoc: number | null;
  batteryOutSoc: number | null;
  workflowStatus: string;
  startedAt: Date;
  completedAt: Date | null;
  batteryInId: string | null;
  batteryOutId: string | null;
  // No: cost, invoice, paymentMethod, userId, walletBalance
};

export const technicalHistoryService = {
  getVehicleTechnicalHistory: async (
    vehicleId: string,
    requestingUserId: string,
    requestingRole: string,
    options: { page: number; size: number },
  ) => {
    // Verify vehicle access
    const vehicle = await prisma.vehicle.findFirst({
      where: { id: vehicleId, isDeleted: false },
    });
    if (!vehicle) throw new NotFoundError("Vehicle not found");

    const isOwner = vehicle.userId === requestingUserId;
    const isPrivileged = ["ADMIN", "MANAGER", "STAFF", "TECHNICIAN"].includes(requestingRole);
    if (!isOwner && !isPrivileged) throw new ForbiddenError("Access denied");

    const { page, size } = options;
    const skip = page * size;

    // Swap transactions - sanitized (no payment data)
    const [swapTransactions, swapTotal] = await Promise.all([
      prisma.swapTransaction.findMany({
        where: { vehicleId },
        skip,
        take: size,
        orderBy: { startedAt: "desc" },
        select: {
          id: true,
          stationId: true,
          batteryInId: true,
          batteryInSoc: true,
          batteryOutId: true,
          batteryOutSoc: true,
          workflowStatus: true,
          startedAt: true,
          completedAt: true,
          // Excluded: cost, status (TransactionStatus), invoice, payments, userId
        },
      }),
      prisma.swapTransaction.count({ where: { vehicleId } }),
    ]);

    // Battery assignments history
    const batteryHistory = await prisma.vehicleBatteryHistory.findMany({
      where: { vehicleId },
      orderBy: { installedAt: "desc" },
      select: {
        id: true,
        vehicleId: true,
        batteryId: true,
        installedAt: true,
        removedAt: true,
        installedStationId: true,
        removedStationId: true,
        installationReason: true,
        removalReason: true,
        current: true,
        battery: {
          select: {
            id: true,
            batteryCode: true,
            type: true,
            soh: true,
            healthClassification: true,
            cycleCount: true,
          },
        },
      },
    });

    // Maintenance records for batteries currently/previously on this vehicle
    const vehicleBatteryIds = batteryHistory.map((h) => h.batteryId);
    const maintenanceRecords = vehicleBatteryIds.length
      ? await prisma.maintenanceRecord.findMany({
          where: { batteryId: { in: vehicleBatteryIds } },
          orderBy: { createdAt: "desc" },
          take: 50,
          select: {
            id: true,
            batteryId: true,
            soh: true,
            soc: true,
            status: true,
            severity: true,
            notes: true,
            createdAt: true,
            // Excluded: technicianId private details
          },
        })
      : [];

    // Battery health logs
    const healthLogs = vehicleBatteryIds.length
      ? await prisma.batteryHealthLog.findMany({
          where: { batteryId: { in: vehicleBatteryIds } },
          orderBy: { recordedAt: "desc" },
          take: 100,
          select: {
            id: true,
            batteryId: true,
            soc: true,
            soh: true,
            temperature: true,
            voltage: true,
            cycleCount: true,
            safetyState: true,
            severity: true,
            recordedAt: true,
          },
        })
      : [];

    return {
      vehicleId,
      swapTransactions: {
        content: swapTransactions,
        totalElements: swapTotal,
        page,
        size,
        totalPages: Math.ceil(swapTotal / size),
      },
      batteryHistory,
      maintenanceRecords,
      healthLogs,
    };
  },
};
