import { BatterySafetyState, VehicleStatus, type Prisma } from "@prisma/client";
import { prisma } from "../../config/database";
import { AppError } from "../../common/errors/app-error";
import {
  transitionVehicleStatus,
  type TransitionContext,
} from "./vehicle-status-transition.service";
import type {
  AdminVehicleListQuery,
  IdentifierCorrectionInput,
  LockVehicleInput,
  MaintenanceInput,
  ReasonInput,
} from "./admin-vehicle.validation";

const activeTransferStatuses = [
  "PENDING",
  "UNDER_REVIEW",
  "NEED_MORE_INFORMATION",
] as const;
const requireVehicle = async (vehicleId: string) => {
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, isDeleted: false },
  });
  if (!vehicle) throw new AppError("Không tìm thấy xe", 404);
  return vehicle;
};

export const listVehicles = async (query: AdminVehicleListQuery) => {
  const where: Prisma.VehicleWhereInput = { isDeleted: false };
  if (query.search)
    where.OR = [
      { plateNumber: { contains: query.search, mode: "insensitive" } },
      { vinNumber: { contains: query.search, mode: "insensitive" } },
      { qrCode: { contains: query.search, mode: "insensitive" } },
      { model: { contains: query.search, mode: "insensitive" } },
      {
        user: {
          is: { fullName: { contains: query.search, mode: "insensitive" } },
        },
      },
      {
        user: {
          is: { email: { contains: query.search, mode: "insensitive" } },
        },
      },
      {
        user: {
          is: { phone: { contains: query.search, mode: "insensitive" } },
        },
      },
    ];
  if (query.status) where.status = query.status;
  if (query.manufacturer)
    where.brand = { contains: query.manufacturer, mode: "insensitive" };
  if (query.model) where.model = { contains: query.model, mode: "insensitive" };
  if (query.productionYear) where.manufactureYear = query.productionYear;
  if (query.minOdo !== undefined || query.maxOdo !== undefined)
    where.currentMileageKm = { gte: query.minOdo, lte: query.maxOdo };
  if (query.createdFrom || query.createdTo)
    where.createdAt = { gte: query.createdFrom, lte: query.createdTo };
  const batteryState =
    query.batterySafety === "NO_DATA"
      ? BatterySafetyState.UNKNOWN
      : query.batterySafety;
  if (
    batteryState ||
    query.minSoh !== undefined ||
    query.maxSoh !== undefined ||
    query.lastInspectionFrom ||
    query.lastInspectionTo
  ) {
    where.batteryAssignments = {
      some: {
        active: true,
        battery: {
          is: {
            ...(batteryState ? { safetyState: batteryState } : {}),
            ...(query.minSoh !== undefined || query.maxSoh !== undefined
              ? { soh: { gte: query.minSoh, lte: query.maxSoh } }
              : {}),
            ...(query.lastInspectionFrom || query.lastInspectionTo
              ? {
                  lastHealthCheckAt: {
                    gte: query.lastInspectionFrom,
                    lte: query.lastInspectionTo,
                  },
                }
              : {}),
          },
        },
      },
    };
  }
  if (query.transferStatus === "NONE")
    where.transferRequests = {
      none: { status: { in: [...activeTransferStatuses] } },
    };
  else if (query.transferStatus)
    where.transferRequests = { some: { status: query.transferStatus } };

  const sortField =
    query.sortBy === "soh" || query.sortBy === "lastInspectionAt"
      ? "createdAt"
      : query.sortBy;
  const orderBy = {
    [sortField]: query.sortOrder,
  } as Prisma.VehicleOrderByWithRelationInput;
  const include = {
    user: {
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        status: true,
      },
    },
    batteryAssignments: {
      where: { active: true },
      take: 1,
      include: { battery: true },
    },
    transferRequests: { orderBy: { createdAt: "desc" as const }, take: 1 },
  };
  const unsafeWhere: Prisma.VehicleWhereInput = {
    isDeleted: false,
    batteryAssignments: {
      some: { active: true, battery: { is: { safetyState: "UNSAFE" } } },
    },
  };
  const [
    items,
    total,
    totalAll,
    active,
    needsInspection,
    unsafe,
    transferPending,
    locked,
  ] = await Promise.all([
    prisma.vehicle.findMany({
      where,
      include,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      orderBy,
    }),
    prisma.vehicle.count({ where }),
    prisma.vehicle.count({ where: { isDeleted: false } }),
    prisma.vehicle.count({ where: { isDeleted: false, status: "ACTIVE" } }),
    prisma.vehicle.count({
      where: { isDeleted: false, status: "NEEDS_INSPECTION" },
    }),
    prisma.vehicle.count({ where: unsafeWhere }),
    prisma.vehicle.count({
      where: {
        isDeleted: false,
        transferRequests: {
          some: { status: { in: [...activeTransferStatuses] } },
        },
      },
    }),
    prisma.vehicle.count({ where: { isDeleted: false, status: "LOCKED" } }),
  ]);

  return {
    items: items.map((vehicle) => {
      const battery = vehicle.batteryAssignments[0]?.battery ?? null;
      const transfer = vehicle.transferRequests[0] ?? null;
      return {
        id: vehicle.id,
        plateNumber: vehicle.plateNumber,
        vinNumber: vehicle.vinNumber,
        qrCode: vehicle.qrCode,
        model: vehicle.model,
        manufacturer: vehicle.brand,
        productionYear: vehicle.manufactureYear,
        imageUrl: vehicle.vehicleImageUrl,
        odo: vehicle.currentMileageKm ?? 0,
        status: vehicle.status,
        createdAt: vehicle.createdAt,
        owner: {
          id: vehicle.user.id,
          fullName: vehicle.user.fullName,
          email: vehicle.user.email,
          phone: vehicle.user.phone,
          status: vehicle.user.status,
        },
        battery: battery
          ? {
              id: battery.id,
              code: battery.batteryCode,
              soh: battery.soh,
              soc: battery.soc,
              safetyStatus:
                battery.safetyState === "UNKNOWN"
                  ? "NO_DATA"
                  : battery.safetyState,
              lastInspectionAt: battery.lastHealthCheckAt,
            }
          : null,
        transfer: transfer
          ? {
              id: transfer.id,
              status: transfer.status,
              createdAt: transfer.createdAt,
            }
          : null,
      };
    }),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
    statistics: {
      total: totalAll,
      active,
      needsInspection,
      unsafe,
      transferPending,
      locked,
    },
  };
};

export const getVehicleDetail = async (vehicleId: string) => {
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, isDeleted: false },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          status: true,
        },
      },
      vehicleModel: true,
      batteryAssignments: {
        where: { active: true },
        take: 1,
        include: { battery: true },
      },
      batteryHistories: {
        where: { current: true },
        orderBy: { installedAt: "desc" },
        take: 1,
        include: { battery: true },
      },
      transferRequests: { orderBy: { createdAt: "desc" }, take: 1 },
      swapTransactions: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          station: { select: { id: true, name: true } },
          batteryOut: true,
        },
      },
      ownershipHistories: { orderBy: { transferredAt: "asc" }, take: 1 },
    },
  });
  if (!vehicle) throw new AppError("Không tìm thấy xe", 404);
  const batteryReference = vehicle.currentBatteryId?.trim();
  const referencedBattery = batteryReference
    ? await prisma.battery.findFirst({
        where: {
          OR: [
            ...(/^[a-f\d]{24}$/i.test(batteryReference)
              ? [{ id: batteryReference }]
              : []),
            { batteryCode: batteryReference },
            { serialNumber: batteryReference },
            { qrCodeValue: batteryReference },
          ],
        },
      })
    : null;
  const battery =
    vehicle.batteryAssignments[0]?.battery ??
    referencedBattery ??
    vehicle.batteryHistories[0]?.battery ??
    vehicle.swapTransactions[0]?.batteryOut ??
    null;
  return {
    ...vehicle,
    user: undefined,
    batteryAssignments: undefined,
    batteryHistories: undefined,
    swapTransactions: undefined,
    transferRequests: undefined,
    ownershipHistories: undefined,
    owner: vehicle.user,
    ownershipStartDate:
      vehicle.ownershipHistories[0]?.transferredAt ?? vehicle.createdAt,
    battery: battery
      ? {
          id: battery.id,
          code: battery.batteryCode,
          serialNumber: battery.serialNumber,
          soh: battery.soh,
          soc: battery.soc,
          cycleCount: battery.cycleCount,
          accumulatedMileageKm: battery.accumulatedMileageKm,
          safetyStatus: battery.safetyState,
          healthClassification: battery.healthClassification,
          lastInspectionAt: battery.lastHealthCheckAt,
        }
      : null,
    transfer: vehicle.transferRequests[0] ?? null,
    lastSwap: vehicle.swapTransactions[0] ?? null,
  };
};

export const getBatteryHealth = async (vehicleId: string) => {
  const vehicle = await requireVehicle(vehicleId);
  const batteryInclude = {
    healthLogs: { orderBy: { recordedAt: "desc" as const }, take: 100 },
  };
  const [assignment, currentHistory, lastSwap] = await Promise.all([
    prisma.vehicleBatteryAssignment.findFirst({
      where: { vehicleId, active: true },
      include: { battery: { include: batteryInclude } },
    }),
    prisma.vehicleBatteryHistory.findFirst({
      where: { vehicleId, current: true },
      orderBy: { installedAt: "desc" },
      include: { battery: { include: batteryInclude } },
    }),
    prisma.swapTransaction.findFirst({
      where: { vehicleId, batteryOutId: { not: null } },
      orderBy: { createdAt: "desc" },
      include: { batteryOut: { include: batteryInclude } },
    }),
  ]);
  if (assignment?.battery) return assignment.battery;

  const batteryReference = vehicle.currentBatteryId?.trim();
  if (batteryReference) {
    const referencedBattery = await prisma.battery.findFirst({
      where: {
        OR: [
          ...(/^[a-f\d]{24}$/i.test(batteryReference)
            ? [{ id: batteryReference }]
            : []),
          { batteryCode: batteryReference },
          { serialNumber: batteryReference },
          { qrCodeValue: batteryReference },
        ],
      },
      include: batteryInclude,
    });
    if (referencedBattery) return referencedBattery;
  }

  return currentHistory?.battery ?? lastSwap?.batteryOut ?? null;
};
export const getSwapHistory = async (vehicleId: string) => {
  await requireVehicle(vehicleId);
  const transactions = await prisma.swapTransaction.findMany({
    where: { vehicleId },
    orderBy: { createdAt: "desc" },
    include: {
      station: { select: { id: true, code: true, name: true } },
      staff: { select: { id: true, fullName: true } },
      batteryIn: {
        select: {
          id: true,
          batteryCode: true,
          serialNumber: true,
          soh: true,
          soc: true,
        },
      },
      batteryOut: {
        select: {
          id: true,
          batteryCode: true,
          serialNumber: true,
          soh: true,
          soc: true,
        },
      },
      inspection: { select: { soh: true, soc: true, outcome: true } },
      invoice: { select: { amount: true, paymentMethod: true, status: true } },
      payments: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { status: true },
      },
    },
  });
  const snapshot = (value: Prisma.JsonValue | null): Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  return transactions.map((transaction) => {
    const vehicleAtSwap = snapshot(transaction.vehicleSnapshot);
    const ownerAtSwap = snapshot(transaction.ownerSnapshot);
    const oldAtSwap = snapshot(transaction.batteryInSnapshot);
    const newAtSwap = snapshot(transaction.batteryOutSnapshot);
    return {
      id: transaction.id,
      code: `SWP-${transaction.id.slice(-10).toUpperCase()}`,
      bookingId: transaction.bookingId,
      createdAt: transaction.createdAt,
      startedAt: transaction.startedAt,
      completedAt: transaction.completedAt,
      status: transaction.workflowStatus,
      vehicle: {
        plateNumber: vehicleAtSwap.plateNumber,
        vinNumber: vehicleAtSwap.vinNumber,
        model: vehicleAtSwap.model,
        odo: vehicleAtSwap.odo,
        ownerName: ownerAtSwap.fullName,
      },
      station: transaction.station,
      staff: transaction.staff,
      oldBattery: transaction.batteryIn
        ? {
            id: transaction.batteryIn.id,
            code: oldAtSwap.batteryCode ?? transaction.batteryIn.batteryCode,
            serialNumber:
              oldAtSwap.serialNumber ?? transaction.batteryIn.serialNumber,
            soh: oldAtSwap.soh ?? transaction.inspection?.soh,
            soc:
              oldAtSwap.soc ??
              transaction.inspection?.soc ??
              transaction.batteryInSoc,
          }
        : null,
      newBattery: transaction.batteryOut
        ? {
            id: transaction.batteryOut.id,
            code: newAtSwap.batteryCode ?? transaction.batteryOut.batteryCode,
            serialNumber:
              newAtSwap.serialNumber ?? transaction.batteryOut.serialNumber,
            soh: newAtSwap.soh,
            soc: newAtSwap.soc ?? transaction.batteryOutSoc,
          }
        : null,
      payment: transaction.invoice
        ? {
            amount: transaction.invoice.amount,
            method: transaction.invoice.paymentMethod,
            status:
              transaction.payments[0]?.status ?? transaction.invoice.status,
          }
        : null,
    };
  });
};
export const getMaintenanceHistory = async (vehicleId: string) => {
  await requireVehicle(vehicleId);
  return prisma.vehicleMaintenanceRecord.findMany({
    where: { vehicleId },
    orderBy: { createdAt: "desc" },
  });
};
export const getIncidents = async (vehicleId: string) => {
  await requireVehicle(vehicleId);
  return prisma.vehicleIncident.findMany({
    where: { vehicleId },
    orderBy: { createdAt: "desc" },
  });
};
export const getOwnershipHistory = async (vehicleId: string) => {
  await requireVehicle(vehicleId);
  return prisma.vehicleOwnershipHistory.findMany({
    where: { vehicleId },
    orderBy: { transferredAt: "desc" },
  });
};
export const getTransferRequests = async (vehicleId: string) => {
  await requireVehicle(vehicleId);
  return prisma.vehicleTransferRequest.findMany({
    where: { vehicleId },
    orderBy: { createdAt: "desc" },
  });
};
export const getAuditLogs = async (vehicleId: string) => {
  await requireVehicle(vehicleId);
  return prisma.auditLog.findMany({
    where: { entityType: "Vehicle", entityId: vehicleId },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { admin: { select: { id: true, fullName: true, email: true } } },
  });
};

export const lockVehicle = async (
  vehicleId: string,
  input: LockVehicleInput,
  context: TransitionContext,
) =>
  transitionVehicleStatus(vehicleId, VehicleStatus.LOCKED, context, {
    ownershipStatus: "LOCKED",
    lockedAt: new Date(),
    lockedBy: context.actorId,
    lockCategory: input.category,
    lockReason: input.reason,
    lockNotes: input.notes,
  });
export const unlockVehicle = async (
  vehicleId: string,
  input: ReasonInput,
  context: TransitionContext,
) => {
  const vehicle = await requireVehicle(vehicleId);
  if (vehicle.status !== "LOCKED") throw new AppError("Xe chưa bị khóa", 409);
  const assignment = await prisma.vehicleBatteryAssignment.findFirst({
    where: { vehicleId, active: true },
    include: { battery: true },
  });
  const target =
    assignment?.battery.safetyState === "UNSAFE"
      ? VehicleStatus.UNSAFE
      : vehicle.previousStatus && vehicle.previousStatus !== "LOCKED"
        ? vehicle.previousStatus
        : VehicleStatus.ACTIVE;
  const activeTransfer = await prisma.vehicleTransferRequest.findFirst({
    where: { vehicleId, status: { in: [...activeTransferStatuses] } },
  });
  return transitionVehicleStatus(vehicleId, target, context, {
    ownershipStatus: activeTransfer ? "TRANSFER_PENDING" : "ACTIVE",
    unlockedAt: new Date(),
    unlockedBy: context.actorId,
    lockReason: null,
    lockNotes: null,
    lockCategory: null,
  });
};
export const markNeedsInspection = (
  vehicleId: string,
  _input: ReasonInput,
  context: TransitionContext,
) =>
  transitionVehicleStatus(vehicleId, VehicleStatus.NEEDS_INSPECTION, context);
export const markMaintenance = async (
  vehicleId: string,
  input: MaintenanceInput,
  context: TransitionContext,
) => {
  const result = await transitionVehicleStatus(
    vehicleId,
    VehicleStatus.MAINTENANCE,
    context,
  );
  await prisma.vehicleMaintenanceRecord.create({
    data: {
      vehicleId,
      code: `VMT-${Date.now()}`,
      type: "TECHNICAL",
      description: input.reason,
      stationId: input.stationId,
      expectedStartDate: input.expectedStartDate,
      expectedCompletionDate: input.expectedCompletionDate,
      notes: input.notes,
    },
  });
  return result;
};
export const deactivateVehicle = async (
  vehicleId: string,
  _input: ReasonInput,
  context: TransitionContext,
) => {
  const activeSwap = await prisma.swapTransaction.findFirst({
    where: {
      vehicleId,
      workflowStatus: { notIn: ["COMPLETED", "FAILED", "ROLLED_BACK"] },
    },
  });
  if (activeSwap)
    throw new AppError("Xe đang có giao dịch đổi pin chưa hoàn tất", 409);
  return transitionVehicleStatus(vehicleId, VehicleStatus.INACTIVE, context, {
    ownershipStatus: "INACTIVE",
    inactiveAt: new Date(),
    inactiveBy: context.actorId,
    inactiveReason: context.reason,
  });
};
export const createIdentifierCorrection = async (
  vehicleId: string,
  input: IdentifierCorrectionInput,
  actorId: string,
) => {
  const vehicle = await requireVehicle(vehicleId);
  if ((vehicle.vinNumber ?? "") !== input.oldValue)
    throw new AppError("VIN hiện tại không khớp", 409);
  const request = await prisma.vehicleIdentifierCorrectionRequest.create({
    data: {
      vehicleId,
      field: input.field,
      oldValue: input.oldValue,
      newValue: input.newValue,
      reason: input.reason,
      requestedBy: actorId,
    },
  });
  await prisma.auditLog.create({
    data: {
      adminId: actorId,
      actorId,
      actorRole: "ADMIN",
      action: "VEHICLE_IDENTIFIER_CORRECTION_REQUESTED",
      entityType: "Vehicle",
      entityId: vehicleId,
      details: input.reason,
      before: { vin: input.oldValue },
      after: { requestedVin: input.newValue },
    },
  });
  return request;
};
