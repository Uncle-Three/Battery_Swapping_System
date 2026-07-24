import { BatterySafetyState, NotificationType, VehicleStatus, type Prisma } from "@prisma/client";
import { prisma } from "../../config/database";
import { AppError } from "../../common/errors/app-error";

const allowed: Record<VehicleStatus, readonly VehicleStatus[]> = {
  ACTIVE: ["NEEDS_INSPECTION", "MAINTENANCE", "LOCKED", "INACTIVE", "SWAP_PENDING", "TRANSFER_PENDING"],
  NEEDS_INSPECTION: ["ACTIVE", "UNSAFE", "MAINTENANCE", "LOCKED", "INACTIVE"],
  UNSAFE: ["MAINTENANCE", "LOCKED", "INACTIVE", "NEEDS_INSPECTION"],
  SWAP_PENDING: ["ACTIVE", "LOCKED"],
  MAINTENANCE: ["ACTIVE", "NEEDS_INSPECTION", "UNSAFE", "LOCKED", "INACTIVE"],
  TRANSFER_PENDING: ["ACTIVE", "LOCKED"],
  LOCKED: ["ACTIVE", "NEEDS_INSPECTION", "UNSAFE", "MAINTENANCE", "INACTIVE"],
  INACTIVE: ["LOCKED"],
};

export type TransitionContext = { actorId: string; reason: string; notes?: string; ipAddress?: string; userAgent?: string };

export const transitionVehicleStatus = async (vehicleId: string, target: VehicleStatus, context: TransitionContext, extra: Prisma.VehicleUpdateInput = {}) => {
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, isDeleted: false },
    include: { batteryAssignments: { where: { active: true }, take: 1, include: { battery: true } } },
  });
  if (!vehicle) throw new AppError("Không tìm thấy xe", 404);
  if (vehicle.status === target) throw new AppError("Xe đã ở trạng thái được yêu cầu", 409);
  if (!allowed[vehicle.status].includes(target) && target !== VehicleStatus.LOCKED) throw new AppError("Chuyển trạng thái xe không hợp lệ", 409);
  const safety = vehicle.batteryAssignments[0]?.battery.safetyState ?? BatterySafetyState.UNKNOWN;
  if (target === VehicleStatus.ACTIVE && safety === BatterySafetyState.UNSAFE) throw new AppError("Không thể kích hoạt xe khi pin chưa an toàn", 409);
  if (target === VehicleStatus.INACTIVE) {
    if (vehicle.status === VehicleStatus.SWAP_PENDING) {
      throw new AppError("Khi đang trong trạng thái thay pin thì không được tắt xe.", 400);
    }
    const activeSwap = await prisma.swapTransaction.findFirst({
      where: {
        vehicleId,
        workflowStatus: {
          notIn: ["COMPLETED", "FAILED", "ROLLED_BACK"],
        },
      },
    });
    if (activeSwap) {
      throw new AppError("Khi đang trong trạng thái thay pin thì không được tắt xe.", 400);
    }
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.vehicle.update({
      where: { id: vehicleId },
      data: { previousStatus: vehicle.status, status: target, ...extra },
    });
    await tx.auditLog.create({ data: {
      adminId: context.actorId, actorId: context.actorId, actorRole: "ADMIN",
      action: `VEHICLE_${target}`, entityType: "Vehicle", entityId: vehicleId,
      details: context.reason, before: { status: vehicle.status }, after: { status: target, notes: context.notes },
      ipAddress: context.ipAddress, userAgent: context.userAgent,
    } });
    await tx.notification.create({ data: {
      userId: vehicle.userId, type: NotificationType.SYSTEM, title: "Trạng thái xe đã thay đổi",
      message: `Xe ${vehicle.plateNumber} đã chuyển sang trạng thái ${target}. Lý do: ${context.reason}`,
      entityType: "Vehicle", entityId: vehicleId,
    } });
    return updated;
  });
};
