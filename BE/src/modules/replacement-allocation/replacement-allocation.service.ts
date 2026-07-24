import { prisma } from "../../config/database";
import { batteryRepository } from "../batteries/battery.repository";
import { BadRequestError } from "../../common/errors/bad-request-error";
import { ConflictError } from "../../common/errors/conflict-error";
import { ForbiddenError } from "../../common/errors/forbidden-error";
import { NotFoundError } from "../../common/errors/not-found-error";
import { SwapStatus } from "@prisma/client";

export const DEFAULT_MINIMUM_REPLACEMENT_SOC = 80;

const cleanBatteryTypeCode = (raw?: string | null): string => {
  if (!raw) return "Không xác định";
  let cleaned = raw
    .replace(/^Pin\s+/i, "")
    .replace(/\s*-\s*\d+(\.\d+)?\s*kWh.*$/i, "")
    .replace(/\s+\d+(\.\d+)?\s*kWh.*$/i, "")
    .replace(/\s*\(\d+V\).*$/i, "")
    .trim();
  return cleaned || raw;
};

const resolveRequiredBatteryType = async (swap: {
  batteryIn?: { batteryTypeId?: string | null; batteryType?: { code: string } | null } | null;
  batteryOut?: { batteryTypeId?: string | null; batteryType?: { code: string } | null } | null;
  vehicle?: { vehicleModelId?: string | null; batteryType?: string | null } | null;
}): Promise<{ id: string | null; code: string }> => {
  if (swap.batteryIn?.batteryTypeId && swap.batteryIn?.batteryType?.code) {
    return {
      id: swap.batteryIn.batteryTypeId,
      code: cleanBatteryTypeCode(swap.batteryIn.batteryType.code),
    };
  }

  if (swap.batteryOut?.batteryTypeId && swap.batteryOut?.batteryType?.code) {
    return {
      id: swap.batteryOut.batteryTypeId,
      code: cleanBatteryTypeCode(swap.batteryOut.batteryType.code),
    };
  }

  if (swap.vehicle?.vehicleModelId) {
    const compat = await prisma.batteryCompatibility.findFirst({
      where: { vehicleModelId: swap.vehicle.vehicleModelId, active: true },
      include: { batteryType: true },
    });
    if (compat?.batteryType) {
      return {
        id: compat.batteryTypeId,
        code: cleanBatteryTypeCode(compat.batteryType.code),
      };
    }
  }

  if (swap.vehicle?.batteryType) {
    const rawType = swap.vehicle.batteryType;
    const cleanedCode = cleanBatteryTypeCode(rawType);

    const foundBt = await prisma.batteryType.findFirst({
      where: {
        OR: [
          { code: { equals: cleanedCode, mode: "insensitive" } },
          { code: { equals: rawType, mode: "insensitive" } },
          { code: { contains: cleanedCode, mode: "insensitive" } },
        ],
      },
    });

    if (foundBt) {
      return {
        id: foundBt.id,
        code: cleanBatteryTypeCode(foundBt.code),
      };
    }

    return {
      id: null,
      code: cleanedCode,
    };
  }

  return {
    id: null,
    code: "Không xác định",
  };
};

const checkAuthorization = async (userId: string, role: string, stationId: string) => {
  if (role === "ADMIN") return true;

  if (role === "MANAGER") {
    const station = await prisma.station.findFirst({
      where: {
        id: stationId,
        OR: [
          { managerId: userId },
          { assignments: { some: { userId, active: true } } },
        ],
      },
    });
    if (station) return true;
  }

  const assignment = await prisma.stationAssignment.findFirst({
    where: {
      userId,
      stationId,
      active: true,
      OR: [{ effectiveTo: null }, { effectiveTo: { gt: new Date() } }],
    },
  });

  if (!assignment && role !== "STAFF" && role !== "STATION_STAFF" && role !== "MANAGER") {
    throw new ForbiddenError("Bạn không có quyền thực hiện thao tác này tại trạm.");
  }
  if (!assignment && (role === "STAFF" || role === "STATION_STAFF" || role === "MANAGER")) {
    throw new ForbiddenError("Bạn không có quyền thực hiện thao tác này tại trạm.");
  }
  return true;
};

const createAuditLog = async (
  action: string,
  entityType: string,
  entityId: string,
  actorId: string,
  actorRole: string,
  stationId: string,
  details?: Record<string, unknown>
) => {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        entityType,
        entityId,
        actorId,
        actorRole,
        stationId,
        details: details ? JSON.stringify(details) : undefined,
      },
    });
  } catch (err) {
    // Non-blocking audit log creation
  }
};

export const replacementAllocationService = {
  getCandidates: async (swapId: string, userId: string, userRole: string) => {
    const swap = await prisma.swapTransaction.findFirst({
      where: { id: swapId },
      include: {
        station: true,
        vehicle: { include: { vehicleModel: true } },
        batteryIn: { include: { batteryType: true } },
        batteryOut: { include: { batteryType: true } },
      },
    });

    if (!swap) {
      throw new NotFoundError("Không tìm thấy giao dịch đổi pin.");
    }

    await checkAuthorization(userId, userRole, swap.stationId);

    // Determine required battery type
    const resolvedType = await resolveRequiredBatteryType(swap);
    let requiredBatteryTypeId = resolvedType.id;
    let requiredBatteryTypeCode = resolvedType.code;

    if (!requiredBatteryTypeId && requiredBatteryTypeCode !== "Không xác định") {
      const foundBt = await batteryRepository.findBatteryTypeById(requiredBatteryTypeCode);
      if (foundBt) {
        requiredBatteryTypeId = foundBt.id;
        requiredBatteryTypeCode = cleanBatteryTypeCode(foundBt.code);
      }
    }

    // STRICT: Nếu không xác định được loại pin cần thiết, không được đề xuất pin nào
    if (!requiredBatteryTypeId) {
      throw new NotFoundError(
        "Không xác định được loại pin phù hợp cho xe này. Vui lòng kiểm tra thông tin xe và loại pin tương thích."
      );
    }

    // Query STRICTLY by batteryTypeId — chỉ lấy đúng loại pin, không bao giờ bỏ qua điều kiện này
    const sameTypeBatteries = await prisma.battery.findMany({
      where: {
        stationId: swap.stationId,
        batteryTypeId: requiredBatteryTypeId,
      },
      include: { batteryType: true },
    });

    const totalSameType = sameTypeBatteries.length;
    const reservedCount = sameTypeBatteries.filter(
      (b) => b.reservedForSwapId !== null || b.operationalStatus === "RESERVED"
    ).length;
    const inUseCount = sameTypeBatteries.filter(
      (b) => b.operationalStatus === "INSTALLED" || b.currentVehicleId !== null
    ).length;
    const lowSocCount = sameTypeBatteries.filter(
      (b) =>
        b.soh === 100 &&
        b.operationalStatus === "AVAILABLE" &&
        b.currentVehicleId === null &&
        b.reservedForSwapId === null &&
        b.soc < DEFAULT_MINIMUM_REPLACEMENT_SOC
    ).length;

    // Filter valid replacement candidates matching ALL conditions:
    // SOH === 100%, condition === "NEW", operationalStatus === "AVAILABLE", stationId === currentStation,
    // currentVehicleId === null, reservedForSwapId === null, soc >= 80%
    const validCandidates = sameTypeBatteries.filter((b) => {
      const isSoh100 = b.soh === 100;
      const isNewCondition = !b.condition || b.condition === "NEW";
      const isAvailable = b.operationalStatus === "AVAILABLE";
      const isUnassigned = b.currentVehicleId === null && b.reservedForSwapId === null;
      const isHighSoc = b.soc >= DEFAULT_MINIMUM_REPLACEMENT_SOC;
      return isSoh100 && isNewCondition && isAvailable && isUnassigned && isHighSoc;
    });

    // Priority sort: 1. Highest SOC desc, 2. Earliest receivedAt/createdAt asc, 3. Lowest batteryCode asc
    validCandidates.sort((a, b) => {
      if (b.soc !== a.soc) return b.soc - a.soc;
      const dateA = new Date(a.receivedAt || a.createdAt).getTime();
      const dateB = new Date(b.receivedAt || b.createdAt).getTime();
      if (dateA !== dateB) return dateA - dateB;
      return (a.batteryCode || a.serialNumber || "").localeCompare(b.batteryCode || b.serialNumber || "");
    });

    const recommendedBattery = validCandidates[0] ? {
      id: validCandidates[0].id,
      code: validCandidates[0].batteryCode || validCandidates[0].serialNumber,
      serialNumber: validCandidates[0].serialNumber || validCandidates[0].batteryCode,
      batteryType: validCandidates[0].batteryType?.code || requiredBatteryTypeCode,
      soh: validCandidates[0].soh,
      soc: validCandidates[0].soc,
      condition: validCandidates[0].condition || "NEW",
      status: validCandidates[0].operationalStatus,
      storageLocation: validCandidates[0].storageLocation || "Kệ A - Ô 05",
      receivedAt: validCandidates[0].receivedAt || validCandidates[0].createdAt,
    } : null;

    const candidateDtos = validCandidates.map((c) => ({
      id: c.id,
      code: c.batteryCode || c.serialNumber,
      serialNumber: c.serialNumber || c.batteryCode,
      batteryType: c.batteryType?.code || requiredBatteryTypeCode,
      soh: c.soh,
      soc: c.soc,
      condition: c.condition || "NEW",
      status: c.operationalStatus,
      storageLocation: c.storageLocation || "Kho trạm",
      receivedAt: c.receivedAt || c.createdAt,
    }));

    return {
      requiredBatteryType: {
        id: requiredBatteryTypeId,
        code: requiredBatteryTypeCode,
      },
      minimumSoc: DEFAULT_MINIMUM_REPLACEMENT_SOC,
      stationId: swap.stationId,
      stationName: swap.station?.name || "Trạm lưu trữ",
      recommendedBattery,
      candidates: candidateDtos,
      stats: {
        totalSameType,
        reservedCount,
        lowSocCount,
        inUseCount,
      },
    };
  },

  reserve: async (swapId: string, batteryId: string, userId: string, userRole: string) => {
    const swap = await prisma.swapTransaction.findFirst({
      where: { id: swapId },
      include: {
        vehicle: { include: { vehicleModel: true } },
        batteryIn: { include: { batteryType: true } },
      },
    });

    if (!swap) {
      throw new NotFoundError("Không tìm thấy giao dịch đổi pin.");
    }

    await checkAuthorization(userId, userRole, swap.stationId);

    // === Xác định loại pin yêu cầu ===
    const resolvedType = await resolveRequiredBatteryType(swap);
    let requiredBatteryTypeId = resolvedType.id;

    if (!requiredBatteryTypeId && resolvedType.code !== "Không xác định") {
      const foundBt = await batteryRepository.findBatteryTypeById(resolvedType.code);
      if (foundBt) {
        requiredBatteryTypeId = foundBt.id;
      }
    }

    if (!requiredBatteryTypeId) {
      throw new NotFoundError(
        "Không xác định được loại pin phù hợp cho xe này. Vui lòng kiểm tra thông tin xe và loại pin tương thích."
      );
    }

    // === Xác nhận pin được chọn đúng loại ===
    const selectedBattery = await prisma.battery.findFirst({
      where: { id: batteryId },
    });

    if (!selectedBattery) {
      throw new NotFoundError("Không tìm thấy pin được chọn.");
    }

    if (selectedBattery.batteryTypeId !== requiredBatteryTypeId) {
      throw new BadRequestError(
        "Pin được chọn không đúng loại yêu cầu. Vui lòng chọn pin cùng loại với pin cũ của xe."
      );
    }

    // If swap already has a reserved replacement battery
    if (swap.batteryOutId) {
      if (swap.batteryOutId === batteryId) {
        const existing = await prisma.battery.findFirst({
          where: { id: batteryId },
          include: { batteryType: true },
        });
        return existing;
      }
      throw new ConflictError("Giao dịch đã có pin thay thế được giữ.");
    }

    // Reserve the battery, advance the workflow and record the customer-visible
    // timeline entry as one atomic operation.
    const updatedSwap = await prisma.$transaction(async (tx) => {
      const updatedResult = await tx.battery.updateMany({
        where: {
          id: batteryId,
          batteryTypeId: requiredBatteryTypeId,
          stationId: swap.stationId,
          operationalStatus: "AVAILABLE",
          reservedForSwapId: null,
          soh: 100,
          soc: { gte: DEFAULT_MINIMUM_REPLACEMENT_SOC },
        },
        data: {
          operationalStatus: "RESERVED",
          status: "READY",
          reservedForSwapId: swapId,
        },
      });

      if (updatedResult.count === 0) {
        throw new ConflictError("Pin này vừa được giữ bởi một giao dịch khác. Vui lòng chọn pin khác.");
      }

      const result = await tx.swapTransaction.update({
        where: { id: swapId },
        data: {
          batteryOutId: batteryId,
          workflowStatus: SwapStatus.REPLACEMENT_ASSIGNED,
        },
        include: {
          batteryOut: { include: { batteryType: true } },
        },
      });
      await tx.swapStepHistory.create({
        data: {
          swapTransactionId: swapId,
          actorId: userId,
          fromStatus: swap.workflowStatus,
          toStatus: SwapStatus.REPLACEMENT_ASSIGNED,
          data: {
            action: "ASSIGN_REPLACEMENT",
            batteryId,
            batteryCode: selectedBattery.batteryCode,
            serialNumber: selectedBattery.serialNumber,
          },
        },
      });
      return result;
    });

    await createAuditLog(
      "REPLACEMENT_BATTERY_RESERVED",
      "Battery",
      batteryId,
      userId,
      userRole,
      swap.stationId,
      { swapId, previousStatus: "AVAILABLE", newStatus: "RESERVED" }
    );

    return updatedSwap;
  },

  cancelReservation: async (swapId: string, userId: string, userRole: string) => {
    const swap = await prisma.swapTransaction.findFirst({
      where: { id: swapId },
      include: { batteryOut: true },
    });

    if (!swap) {
      throw new NotFoundError("Không tìm thấy giao dịch đổi pin.");
    }

    await checkAuthorization(userId, userRole, swap.stationId);

    if (!swap.batteryOutId) {
      throw new BadRequestError("Giao dịch chưa giữ pin nào.");
    }

    if (swap.workflowStatus === SwapStatus.INSTALLED || swap.workflowStatus === SwapStatus.COMPLETED) {
      throw new ConflictError("Pin đã được lắp hoặc giao dịch đã hoàn tất, không thể hủy giữ.");
    }

    const reservedBatteryId = swap.batteryOutId;

    const updatedSwap = await prisma.$transaction(async (tx) => {
      await tx.battery.update({
        where: { id: reservedBatteryId },
        data: {
          operationalStatus: "AVAILABLE",
          reservedForSwapId: null,
        },
      });
      const result = await tx.swapTransaction.update({
        where: { id: swapId },
        data: {
          batteryOutId: null,
          workflowStatus: SwapStatus.OLD_BATTERY_REMOVED,
        },
      });
      await tx.swapStepHistory.create({
        data: {
          swapTransactionId: swapId,
          actorId: userId,
          fromStatus: swap.workflowStatus,
          toStatus: SwapStatus.OLD_BATTERY_REMOVED,
          data: {
            action: "CANCEL_REPLACEMENT_RESERVATION",
            batteryId: reservedBatteryId,
          },
        },
      });
      return result;
    });

    await createAuditLog(
      "REPLACEMENT_RESERVATION_CANCELLED",
      "Battery",
      reservedBatteryId,
      userId,
      userRole,
      swap.stationId,
      { swapId, previousStatus: "RESERVED", newStatus: "AVAILABLE" }
    );

    return updatedSwap;
  },

  verifyQr: async (swapId: string, scannedValue: string, userId: string, userRole: string) => {
    const swap = await prisma.swapTransaction.findFirst({
      where: { id: swapId },
      include: {
        batteryOut: { include: { batteryType: true } },
      },
    });

    if (!swap) {
      throw new NotFoundError("Không tìm thấy giao dịch đổi pin.");
    }

    await checkAuthorization(userId, userRole, swap.stationId);

    if (!swap.batteryOutId || !swap.batteryOut) {
      throw new BadRequestError("Chưa có pin nào được giữ cho giao dịch này.");
    }

    const reserved = swap.batteryOut;
    const cleanScanned = scannedValue.replace(/[\u200B-\u200D\uFEFF]/g, "").trim().toUpperCase();
    const cleanCode = (reserved.batteryCode || "").trim().toUpperCase();
    const cleanSerial = (reserved.serialNumber || "").trim().toUpperCase();
    const cleanQr = (reserved.qrCodeValue || "").trim().toUpperCase();
    const cleanId = (reserved.id || "").trim().toUpperCase();

    const isMatch =
      cleanScanned === cleanCode ||
      cleanScanned === cleanSerial ||
      cleanScanned === cleanQr ||
      cleanScanned === cleanId ||
      cleanScanned.includes(cleanCode) ||
      cleanScanned.includes(cleanSerial);

    if (!isMatch) {
      await createAuditLog(
        "REPLACEMENT_BATTERY_VERIFICATION_FAILED",
        "Battery",
        reserved.id,
        userId,
        userRole,
        swap.stationId,
        { swapId, scannedValue, expectedCode: reserved.batteryCode }
      );

      const location = reserved.storageLocation || "Kệ A - Ô 05";
      throw new ConflictError(
        `Pin vừa quét không phải pin đã được giữ cho giao dịch này. Vui lòng lấy đúng pin ${reserved.batteryCode || reserved.serialNumber} tại ${location}.`
      );
    }

    await createAuditLog(
      "REPLACEMENT_BATTERY_QR_VERIFIED",
      "Battery",
      reserved.id,
      userId,
      userRole,
      swap.stationId,
      { swapId, verified: true }
    );

    return {
      success: true,
      message: "Đúng pin đã giữ. Có thể tiến hành lắp pin.",
      data: {
        verified: true,
        battery: {
          id: reserved.id,
          code: reserved.batteryCode,
          serialNumber: reserved.serialNumber,
          storageLocation: reserved.storageLocation,
        },
      },
    };
  },

  install: async (swapId: string, userId: string, userRole: string) => {
    const swap = await prisma.swapTransaction.findFirst({
      where: { id: swapId },
      include: {
        batteryIn: true,
        batteryOut: true,
        vehicle: true,
      },
    });

    if (!swap) {
      throw new NotFoundError("Không tìm thấy giao dịch đổi pin.");
    }

    await checkAuthorization(userId, userRole, swap.stationId);

    if (!swap.batteryInId) {
      throw new BadRequestError("Bước 2 chưa hoàn tất (Chưa tháo pin cũ khỏi xe).");
    }

    if (!swap.batteryOutId || !swap.batteryOut) {
      throw new BadRequestError("Chưa giữ pin thay thế cho giao dịch này.");
    }

    if (swap.workflowStatus === SwapStatus.INSTALLED || swap.workflowStatus === SwapStatus.COMPLETED) {
      return swap;
    }

    const replacementBattery = swap.batteryOut;
    const vehicleId = swap.vehicleId;

    // Execute atomic transaction for installation
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update replacement battery
      const updatedBattery = await tx.battery.update({
        where: { id: replacementBattery.id },
        data: {
          operationalStatus: "INSTALLED",
          status: "READY",
          condition: replacementBattery.condition || "NEW",
          currentVehicleId: vehicleId,
          stationId: swap.stationId,
          storageLocation: null,
          reservedForSwapId: null,
        },
      });

      // 2. Update vehicle's current battery
      if (vehicleId) {
        await tx.vehicle.update({
          where: { id: vehicleId },
          data: { currentBatteryId: replacementBattery.id },
        });
      }

      // 3. Update swap transaction status
      const updatedSwap = await tx.swapTransaction.update({
        where: { id: swapId },
        data: {
          batteryOutId: replacementBattery.id,
          batteryOutSoc: replacementBattery.soc,
          workflowStatus: SwapStatus.INSTALLED,
        },
        include: {
          batteryIn: true,
          batteryOut: true,
          vehicle: true,
        },
      });
      await tx.swapStepHistory.create({
        data: {
          swapTransactionId: swapId,
          actorId: userId,
          fromStatus: swap.workflowStatus,
          toStatus: SwapStatus.INSTALLED,
          data: {
            action: "INSTALL",
            batteryId: replacementBattery.id,
            batteryCode: replacementBattery.batteryCode,
            serialNumber: replacementBattery.serialNumber,
          },
        },
      });

      // 4. Create BatteryMovement record
      await tx.batteryMovement.create({
        data: {
          batteryId: replacementBattery.id,
          movementType: "INSTALLED_TO_VEHICLE",
          toStationId: swap.stationId,
          fromLocation: replacementBattery.storageLocation || "Kệ A - Ô 05",
          performedBy: userId,
          note: `Đã lắp pin mới ${replacementBattery.batteryCode} vào xe ${swap.vehicleId || ""}`,
        },
      });

      // 5. Create Audit log
      await tx.auditLog.create({
        data: {
          action: "REPLACEMENT_BATTERY_INSTALLED",
          entityType: "Battery",
          entityId: replacementBattery.id,
          actorId: userId,
          actorRole: userRole,
          stationId: swap.stationId,
          details: JSON.stringify({
            swapId,
            vehicleId,
            batteryCode: replacementBattery.batteryCode,
          }),
        },
      });

      return updatedSwap;
    });

    return result;
  },

  reportShortage: async (swapId: string, reason: string | undefined, userId: string, userRole: string) => {
    const swap = await prisma.swapTransaction.findFirst({
      where: { id: swapId },
      include: { batteryIn: { include: { batteryType: true } } },
    });

    if (!swap) {
      throw new NotFoundError("Không tìm thấy giao dịch đổi pin.");
    }

    await checkAuthorization(userId, userRole, swap.stationId);

    const shortageReason = reason || "Kho hiện không đủ pin mới đáp ứng tiêu chuẩn SOH 100% và SOC >= 80%";

    await createAuditLog(
      "BATTERY_SHORTAGE_REPORTED",
      "SwapTransaction",
      swapId,
      userId,
      userRole,
      swap.stationId,
      {
        shortageReason,
        batteryTypeId: swap.batteryIn?.batteryTypeId,
        batteryTypeCode: swap.batteryIn?.batteryType?.code,
      }
    );



    return {
      success: true,
      message: "Đã gửi báo cáo thiếu hụt pin đến quản lý trạm.",
    };
  },

  getStatus: async (swapId: string, userId: string, userRole: string) => {
    const swap = await prisma.swapTransaction.findFirst({
      where: { id: swapId },
      include: {
        station: true,
        vehicle: true,
        batteryIn: { include: { batteryType: true } },
        batteryOut: { include: { batteryType: true } },
      },
    });

    if (!swap) {
      throw new NotFoundError("Không tìm thấy giao dịch đổi pin.");
    }

    await checkAuthorization(userId, userRole, swap.stationId);

    // getCandidates có thể throw nếu không xác định được loại pin — handle gracefully
    let candidatesResult: Awaited<ReturnType<typeof replacementAllocationService.getCandidates>> | null = null;
    try {
      candidatesResult = await replacementAllocationService.getCandidates(swapId, userId, userRole);
    } catch {
      // Không có loại pin xác định được hoặc lỗi khác — tiếp tục với candidates rỗng
      candidatesResult = null;
    }

    let state: "SEARCHING" | "NO_BATTERY_AVAILABLE" | "BATTERY_SUGGESTED" | "BATTERY_RESERVED" | "QR_VERIFIED" | "BATTERY_INSTALLED" = "SEARCHING";

    if (swap.workflowStatus === SwapStatus.INSTALLED || swap.workflowStatus === SwapStatus.PAYMENT_PENDING || swap.workflowStatus === SwapStatus.COMPLETED) {
      state = "BATTERY_INSTALLED";
    } else if (swap.batteryOutId && swap.batteryOut) {
      state = "BATTERY_RESERVED";
    } else if (candidatesResult?.recommendedBattery) {
      state = "BATTERY_SUGGESTED";
    } else {
      state = candidatesResult ? "NO_BATTERY_AVAILABLE" : "SEARCHING";
    }
    // Determine required battery type, fallback to resolving vehicle's battery type if needed
    const requiredBatteryType = candidatesResult?.requiredBatteryType || (await resolveRequiredBatteryType(swap));
    return {
      success: true,
      data: {
        state,
        swapId: swap.id,
        workflowStatus: swap.workflowStatus,
        stationId: swap.stationId,
        stationName: swap.station?.name || "Trạm lưu trữ",
        requiredBatteryType,
        minimumSoc: candidatesResult?.minimumSoc ?? 80,
        recommendedBattery: candidatesResult?.recommendedBattery ?? null,
        reservedBattery: swap.batteryOut ? {
          id: swap.batteryOut.id,
          code: swap.batteryOut.batteryCode || swap.batteryOut.serialNumber,
          serialNumber: swap.batteryOut.serialNumber || swap.batteryOut.batteryCode,
          batteryType: swap.batteryOut.batteryType?.code || requiredBatteryType.code,
          soh: swap.batteryOut.soh,
          soc: swap.batteryOut.soc,
          condition: swap.batteryOut.condition || "NEW",
          status: swap.batteryOut.operationalStatus,
          storageLocation: swap.batteryOut.storageLocation || "Kệ A - Ô 05",
          receivedAt: swap.batteryOut.receivedAt || swap.batteryOut.createdAt,
        } : null,
        candidates: candidatesResult?.candidates ?? [],
        stats: candidatesResult?.stats ?? { totalSameType: 0, reservedCount: 0, lowSocCount: 0, inUseCount: 0 },
      },
    };
  },
};
