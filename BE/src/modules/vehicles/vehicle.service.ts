import { randomUUID } from "node:crypto";
import { BatteryHealthSource, Prisma } from "@prisma/client";
import { prisma } from "../../config/database";
import { AppError } from "../../common/errors/app-error";
import { calculateBatterySoh, classifyBatterySoh, inferAccumulatedMileageKm } from "../battery-health/battery-soh";

type VehicleListOptions = {
  page: number;
  size: number;
  sort: string;
  search?: string;
  vehicleStatus?: "ACTIVE" | "INACTIVE";
  batteryStatus?: "READY" | "CHARGING" | "MAINTENANCE" | "FAULTY";
  healthClassification?: "HEALTHY" | "LIMITED" | "NEEDS_MAINTENANCE" | "REPLACEMENT_REQUIRED" | "UNSAFE" | "UNKNOWN";
};

type HistoryOptions = { page: number; size: number };

const addMileageToActiveBattery = async (
  tx: Prisma.TransactionClient,
  vehicleId: string,
  differenceKm: number,
  newVehicleMileageKm: number,
) => {
  if (differenceKm < 0) return;

  const assignment = await tx.vehicleBatteryAssignment.findFirst({
    where: { vehicleId, active: true },
    orderBy: { assignedAt: "desc" },
    include: { battery: true },
  });
  if (!assignment) return;

  const isLegacyDefaultBattery =
    assignment.battery.currentVehicleId === vehicleId &&
    (assignment.battery.accumulatedMileageKm ?? 0) === 0 &&
    assignment.battery.soh === 100;
  const accumulatedMileageKm = isLegacyDefaultBattery
    ? newVehicleMileageKm
    : inferAccumulatedMileageKm(
        assignment.battery.accumulatedMileageKm,
        assignment.battery.soh,
      ) + differenceKm;
  const soh = calculateBatterySoh(accumulatedMileageKm);

  await tx.battery.update({
    where: { id: assignment.batteryId },
    data: {
      accumulatedMileageKm,
      soh,
      estimatedSoH: soh,
      healthClassification: classifyBatterySoh(soh),
      healthSource: BatteryHealthSource.LIFECYCLE_SIMULATION,
      lastEstimatedAt: new Date(),
      lastUpdated: new Date(),
    },
  });
};

export const getMyVehicles = async (userId: string, options: VehicleListOptions) => {
  const { page, size, sort, search, vehicleStatus, batteryStatus, healthClassification } = options;
  const skip = page * size;
  const take = size;

  const where: Prisma.VehicleWhereInput = { userId, isDeleted: false };

  if (search) {
    where.OR = [
      { plateNumber: { contains: search, mode: "insensitive" } },
      { vinNumber: { contains: search, mode: "insensitive" } },
      { model: { contains: search, mode: "insensitive" } },
    ];
  }

  if (vehicleStatus) where.status = vehicleStatus;
  
  if (batteryStatus || healthClassification) {
    const batteryConditions: Prisma.BatteryWhereInput = {};
    if (batteryStatus) batteryConditions.status = batteryStatus;
    if (healthClassification) batteryConditions.healthClassification = healthClassification;
    where.batteryAssignments = {
      some: {
        active: true,
        battery: { is: batteryConditions },
      },
    };
  }

  const [sortField, sortDirection] = sort.split(",") as ["createdAt" | "updatedAt" | "plateNumber", "asc" | "desc"];
  const orderBy: Prisma.VehicleOrderByWithRelationInput = { [sortField]: sortDirection };

  const [vehicles, total] = await Promise.all([
    prisma.vehicle.findMany({
      where,
      skip,
      take,
      orderBy,
      include: {
        batteryAssignments: {
          where: { active: true },
          orderBy: { assignedAt: "desc" },
          include: { battery: { include: { batteryType: true } } }
        }
      }
    }),
    prisma.vehicle.count({ where })
  ]);

  // Format response
  const content = await Promise.all(
    vehicles.map(async (v) => {
      let battery = (v.batteryAssignments[0]?.battery as any) ?? null;
      if (!battery && v.currentBatteryId) {
        battery = await prisma.battery.findUnique({
          where: { id: v.currentBatteryId },
          include: { batteryType: true },
        }) as any;
      }

      let swapEligible = true;
      if (!battery) swapEligible = false;
      
      return {
        id: v.id,
        ownerId: v.userId,
        plateNumber: v.plateNumber,
        vin: v.vinNumber,
        brand: v.brand,
        model: v.model,
        manufactureYear: v.manufactureYear,
        purchaseDate: v.purchaseDate,
        currentMileageKm: v.currentMileageKm,
        batteryType: v.batteryType,
        batteryOwnershipType: v.batteryOwnershipType,
        status: v.status,
        swapEligible,
        createdAt: v.createdAt,
        updatedAt: v.updatedAt,
        currentBattery: battery ? {
          id: battery.id,
          batteryCode: battery.batteryCode,
          qrCodeValue: battery.qrCodeValue,
          batteryType: battery.batteryType?.code || battery.type || v.batteryType || "LITHIUM_ION",
          estimatedSoH: calculateBatterySoh(inferAccumulatedMileageKm(battery.accumulatedMileageKm, battery.soh)),
          healthClassification: battery.healthClassification,
          healthSource: battery.healthSource,
          status: battery.status,
          cycleCount: battery.cycleCount,
          lastInspectionAt: battery.lastHealthCheckAt,
          lastSwappedAt: v.batteryAssignments[0]?.assignedAt || battery.createdAt || undefined
        } : undefined
      };
    })
  );

  return {
    content,
    page,
    size,
    totalElements: total,
    totalPages: Math.ceil(total / size),
    first: page === 0,
    last: page === Math.ceil(total / size) - 1 || total === 0
  };
};

export const getAllVehicles = async (options: VehicleListOptions) => {
  const { page, size, sort, search, vehicleStatus, batteryStatus, healthClassification } = options;
  const where: Prisma.VehicleWhereInput = { isDeleted: false };

  if (search) {
    where.OR = [
      { plateNumber: { contains: search, mode: "insensitive" } },
      { vinNumber: { contains: search, mode: "insensitive" } },
      { model: { contains: search, mode: "insensitive" } },
      { brand: { contains: search, mode: "insensitive" } },
      { user: { is: { fullName: { contains: search, mode: "insensitive" } } } },
      { user: { is: { email: { contains: search, mode: "insensitive" } } } },
      { user: { is: { phone: { contains: search, mode: "insensitive" } } } },
    ];
  }

  if (vehicleStatus) where.status = vehicleStatus;
  if (batteryStatus || healthClassification) {
    const batteryConditions: Prisma.BatteryWhereInput = {};
    if (batteryStatus) batteryConditions.status = batteryStatus;
    if (healthClassification) batteryConditions.healthClassification = healthClassification;
    where.batteryAssignments = {
      some: { active: true, battery: { is: batteryConditions } },
    };
  }

  const [sortField, sortDirection] = sort.split(",") as ["createdAt" | "updatedAt" | "plateNumber", "asc" | "desc"];
  const orderBy: Prisma.VehicleOrderByWithRelationInput = { [sortField]: sortDirection };
  const [vehicles, total] = await Promise.all([
    prisma.vehicle.findMany({
      where,
      skip: page * size,
      take: size,
      orderBy,
      include: {
        user: { select: { id: true, fullName: true, email: true, phone: true } },
      },
    }),
    prisma.vehicle.count({ where }),
  ]);

  return {
    content: vehicles.map((vehicle) => ({
      id: vehicle.id,
      userId: vehicle.userId,
      name: vehicle.name,
      plateNumber: vehicle.plateNumber,
      vinNumber: vehicle.vinNumber,
      brand: vehicle.brand,
      model: vehicle.model,
      manufactureYear: vehicle.manufactureYear,
      currentMileageKm: vehicle.currentMileageKm,
      batteryType: vehicle.batteryType,
      status: vehicle.status,
      ownershipStatus: vehicle.ownershipStatus,
      vehicleImageUrl: vehicle.vehicleImageUrl,
      createdAt: vehicle.createdAt,
      updatedAt: vehicle.updatedAt,
      user: {
        id: vehicle.user.id,
        name: vehicle.user.fullName,
        fullName: vehicle.user.fullName,
        email: vehicle.user.email,
        phone: vehicle.user.phone,
      },
    })),
    page,
    size,
    totalElements: total,
    totalPages: Math.ceil(total / size),
    first: page === 0,
    last: page >= Math.max(0, Math.ceil(total / size) - 1),
  };
};

export const getVehicleById = async (userId: string, vehicleId: string) => {
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, userId, isDeleted: false },
    include: {
      batteryAssignments: {
        where: { active: true },
        orderBy: { assignedAt: "desc" },
        include: { battery: { include: { batteryType: true } } }
      }
    }
  });

  if (!vehicle) {
    throw new AppError("Không tìm thấy xe", 404);
  }

  let battery = (vehicle.batteryAssignments[0]?.battery as any) ?? null;
  if (!battery && vehicle.currentBatteryId) {
    battery = await prisma.battery.findUnique({
      where: { id: vehicle.currentBatteryId },
      include: { batteryType: true },
    }) as any;
  }

  return {
    id: vehicle.id,
    ownerId: vehicle.userId,
    plateNumber: vehicle.plateNumber,
    vin: vehicle.vinNumber,
    brand: vehicle.brand,
    model: vehicle.model,
    manufactureYear: vehicle.manufactureYear,
    purchaseDate: vehicle.purchaseDate,
    color: vehicle.color,
    currentMileageKm: vehicle.currentMileageKm,
    batteryType: vehicle.batteryType,
    batteryOwnershipType: vehicle.batteryOwnershipType,
    preferredStationId: vehicle.preferredStationId,
    status: vehicle.status,
    createdAt: vehicle.createdAt,
    updatedAt: vehicle.updatedAt,
    currentBattery: battery ? {
      id: battery.id,
      batteryCode: battery.batteryCode,
      qrCodeValue: battery.qrCodeValue,
      batteryType: battery.batteryType?.code || battery.type || vehicle.batteryType || "LITHIUM_ION",
      manufacturer: battery.manufacturer,
      manufacturedDate: battery.manufacturedDate,
      activatedDate: battery.activatedDate,
      ratedCapacity: battery.ratedCapacityAh,
      estimatedSoH: calculateBatterySoh(inferAccumulatedMileageKm(battery.accumulatedMileageKm, battery.soh)),
      healthClassification: battery.healthClassification,
      healthSource: battery.healthSource,
      status: battery.status,
      cycleCount: battery.cycleCount,
      lastInspectionAt: battery.lastHealthCheckAt,
      lastSwappedAt: vehicle.batteryAssignments[0]?.assignedAt || battery.createdAt || undefined,
      nextRecommendedInspection: undefined // implement logic
    } : undefined
  };
};

export const createVehicle = async (userId: string, payload: any) => {
  // Normalize plate
  const normalizedPlate = payload.plateNumber.toUpperCase().trim();
  const normalizedVin = payload.vinNumber?.trim().toUpperCase() || undefined;
  const normalizedBatteryCode = payload.qrCodeValue.trim();
  
  const existingPlate = await prisma.vehicle.findFirst({
    where: { plateNumber: normalizedPlate }
  });

  if (existingPlate) {
    throw new AppError("Biển số xe này đã được đăng ký", 400);
  }

  if (normalizedVin) {
    const existingVin = await prisma.vehicle.findFirst({
      where: { vinNumber: normalizedVin }
    });
    if (existingVin) {
      throw new AppError("Mã số khung (VIN) này đã được đăng ký", 400);
    }
  }

  const existingBattery = await prisma.battery.findFirst({
    where: {
      OR: [
        { batteryCode: normalizedBatteryCode },
        { qrCodeValue: normalizedBatteryCode },
        { serialNumber: normalizedBatteryCode },
      ],
    },
  });
  if (existingBattery) {
    throw new AppError("Mã QR pin này đã tồn tại trong hệ thống.", 409);
  }

  const vehicleId = await prisma.$transaction(async (tx) => {
    const newVehicle = await tx.vehicle.create({
      data: {
        userId,
        name: `${payload.brand} ${payload.model}`,
        plateNumber: normalizedPlate,
        vinNumber: normalizedVin,
        brand: payload.brand,
        model: payload.model,
        manufactureYear: payload.manufactureYear,
        purchaseDate: payload.purchaseDate,
        currentMileageKm: payload.currentMileageKm,
        batteryType: payload.batteryType,
        batteryOwnershipType: payload.batteryOwnershipType,
        color: payload.color,
        vehicleImageUrl: payload.vehicleImageUrl,
        registrationDocumentUrl: payload.registrationDocumentUrl,
        preferredStationId: payload.preferredStationId,
        note: payload.note,
        status: "ACTIVE",
      },
    });

    const code = normalizedBatteryCode;
    const initialBatteryMileageKm = payload.currentMileageKm ?? 0;
    const initialBatterySoh = calculateBatterySoh(initialBatteryMileageKm);
    const newBattery = await tx.battery.create({
      data: {
        batteryCode: code,
        qrCodeValue: code,
        serialNumber: code,
        soc: 100,
        soh: initialBatterySoh,
        temperature: 25,
        voltage: 400,
        accumulatedMileageKm: initialBatteryMileageKm,
        type: payload.batteryType,
        estimatedSoH: initialBatterySoh,
        healthClassification: classifyBatterySoh(initialBatterySoh),
        healthSource: "LIFECYCLE_SIMULATION",
        status: "READY",
        currentVehicleId: newVehicle.id,
        activatedDate: new Date(),
      },
    });

    await tx.vehicle.update({ where: { id: newVehicle.id }, data: { currentBatteryId: newBattery.id } });
    await tx.vehicleBatteryAssignment.create({
      data: { vehicleId: newVehicle.id, batteryId: newBattery.id, active: true, assignedAt: new Date() },
    });
    await tx.vehicleBatteryHistory.create({
      data: { vehicleId: newVehicle.id, batteryId: newBattery.id, installedAt: new Date(), installationReason: "Initial registration assignment", current: true },
    });
    await tx.vehicleMileageHistory.create({
      data: { vehicleId: newVehicle.id, newMileageKm: payload.currentMileageKm, differenceKm: 0, note: "Initial mileage at registration" },
    });
    return newVehicle.id;
  });

  return getVehicleById(userId, vehicleId);
};

export const updateVehicle = async (userId: string, vehicleId: string, payload: any) => {
  await prisma.$transaction(async (tx) => {
    const vehicle = await tx.vehicle.findFirst({ where: { id: vehicleId, userId, isDeleted: false } });
    if (!vehicle) throw new AppError("Không tìm thấy xe", 404);
    if (payload.currentMileageKm !== undefined && payload.currentMileageKm < (vehicle.currentMileageKm ?? 0)) {
      throw new AppError("Số km mới không được nhỏ hơn số km cũ", 400);
    }

    const data: Prisma.VehicleUpdateInput = {};
    if (payload.vinNumber !== undefined) {
      const normalizedVin = payload.vinNumber.trim().toUpperCase();
      if (vehicle.vinNumber && vehicle.vinNumber !== normalizedVin) {
        throw new AppError("Mã số khung (VIN) đã được thiết lập và không thể thay đổi", 400);
      }
      if (!vehicle.vinNumber) {
        const existingVin = await tx.vehicle.findFirst({
          where: { vinNumber: normalizedVin, id: { not: vehicleId } },
        });
        if (existingVin) {
          throw new AppError("Mã số khung (VIN) này đã được đăng ký", 409);
        }
        data.vinNumber = normalizedVin;
      }
    }
    if (payload.status !== undefined) {
      if (payload.status === "INACTIVE") {
        if (vehicle.status === "SWAP_PENDING") {
          throw new AppError("Khi đang trong trạng thái thay pin thì không được tắt xe.", 400);
        }
        const activeSwap = await tx.swapTransaction.findFirst({
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
        const activeBooking = await tx.booking.findFirst({
          where: {
            vehicleId,
            status: { in: ["CHECKED_IN"] },
          },
        });
        if (activeBooking) {
          throw new AppError("Khi đang trong trạng thái thay pin thì không được tắt xe.", 400);
        }
      }
      data.status = payload.status;
    }
    if (payload.brand !== undefined) data.brand = payload.brand;
    if (payload.model !== undefined) data.model = payload.model;
    if (payload.color !== undefined) data.color = payload.color;
    if (payload.purchaseDate !== undefined) data.purchaseDate = payload.purchaseDate;
    if (payload.vehicleImageUrl !== undefined) data.vehicleImageUrl = payload.vehicleImageUrl;
    if (payload.registrationDocumentUrl !== undefined) data.registrationDocumentUrl = payload.registrationDocumentUrl;
    if (payload.preferredStationId !== undefined) data.preferredStationId = payload.preferredStationId;
    if (payload.note !== undefined) data.note = payload.note;
    if (payload.currentMileageKm !== undefined) data.currentMileageKm = payload.currentMileageKm;
    await tx.vehicle.update({ where: { id: vehicleId }, data });

    if (payload.currentMileageKm !== undefined && payload.currentMileageKm !== vehicle.currentMileageKm) {
      const differenceKm = payload.currentMileageKm - (vehicle.currentMileageKm ?? 0);
      await tx.vehicleMileageHistory.create({
        data: {
          vehicleId,
          previousMileageKm: vehicle.currentMileageKm,
          newMileageKm: payload.currentMileageKm,
          differenceKm,
          note: "Mileage updated with vehicle details",
        },
      });
      await addMileageToActiveBattery(tx, vehicleId, differenceKm, payload.currentMileageKm);
    }
  });

  return getVehicleById(userId, vehicleId);
};

export const updateMileage = async (userId: string, vehicleId: string, payload: any) => {
  await prisma.$transaction(async (tx) => {
    const vehicle = await tx.vehicle.findFirst({ where: { id: vehicleId, userId, isDeleted: false } });
    if (!vehicle) throw new AppError("Không tìm thấy xe", 404);
    if (payload.currentMileageKm < (vehicle.currentMileageKm ?? 0)) {
      throw new AppError("Số km mới không được nhỏ hơn số km cũ", 400);
    }

    const difference = payload.currentMileageKm - (vehicle.currentMileageKm ?? 0);
    await tx.vehicle.update({ where: { id: vehicleId }, data: { currentMileageKm: payload.currentMileageKm } });
    await tx.vehicleMileageHistory.create({
      data: {
        vehicleId,
        previousMileageKm: vehicle.currentMileageKm,
        newMileageKm: payload.currentMileageKm,
        differenceKm: difference,
        recordedAt: payload.recordedAt ?? new Date(),
        note: payload.note,
      },
    });
    await addMileageToActiveBattery(tx, vehicleId, difference, payload.currentMileageKm);
  });

  return { success: true };
};

export const deleteVehicle = async (userId: string, vehicleId: string) => {
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, userId, isDeleted: false }
  });

  if (!vehicle) {
    throw new AppError("Không tìm thấy xe", 404);
  }

  // Check business rules (no active booking etc)
  const activeBooking = await prisma.booking.findFirst({
    where: {
      vehicleId,
      status: { in: ["CREATED", "PENDING_APPROVAL", "APPROVED", "CHECKED_IN"] }
    }
  });

  if (activeBooking) {
    throw new AppError("Không thể xóa xe đang có lịch hẹn đổi pin", 400);
  }

  await prisma.vehicle.update({
    where: { id: vehicleId },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy: userId,
      status: "INACTIVE"
    }
  });
};

export const getBatteryHistory = async (userId: string, vehicleId: string, options: HistoryOptions) => {
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, userId, isDeleted: false }
  });

  if (!vehicle) throw new AppError("Không tìm thấy xe", 404);

  const { page, size } = options;
  const skip = page * size;
  
  const [history, total] = await Promise.all([
    prisma.vehicleBatteryHistory.findMany({
      where: { vehicleId },
      skip,
      take: size,
      orderBy: { installedAt: 'desc' },
      include: { battery: true }
    }),
    prisma.vehicleBatteryHistory.count({ where: { vehicleId } })
  ]);

  return {
    content: history,
    page,
    size,
    totalElements: total,
    totalPages: Math.ceil(total / size),
    first: page === 0,
    last: page === Math.ceil(total / size) - 1 || total === 0
  };
};

export const getMileageHistory = async (userId: string, vehicleId: string, options: HistoryOptions) => {
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, userId, isDeleted: false }
  });

  if (!vehicle) throw new AppError("Không tìm thấy xe", 404);

  const { page, size } = options;
  const skip = page * size;

  const [history, total] = await Promise.all([
    prisma.vehicleMileageHistory.findMany({
      where: { vehicleId },
      skip,
      take: size,
      orderBy: { recordedAt: 'desc' }
    }),
    prisma.vehicleMileageHistory.count({ where: { vehicleId } })
  ]);

  return {
    content: history,
    page,
    size,
    totalElements: total,
    totalPages: Math.ceil(total / size),
    first: page === 0,
    last: page === Math.ceil(total / size) - 1 || total === 0
  };
};

export const getBatteryQr = async (userId: string, vehicleId: string) => {
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, userId, isDeleted: false },
    include: {
      batteryAssignments: {
        where: { active: true },
        include: { battery: true }
      }
    }
  });

  if (!vehicle) throw new AppError("Không tìm thấy xe", 404);

  const assignment = vehicle.batteryAssignments[0];
  if (!assignment || !assignment.battery) {
    throw new AppError("Xe không có pin đang hoạt động", 400);
  }

  const battery = assignment.battery;

  return {
    batteryId: battery.id,
    batteryCode: battery.batteryCode,
    qrCodeValue: battery.qrCodeValue || battery.batteryCode,
    scanUrl: `/app/staff/battery-scan/${battery.qrCodeValue || battery.batteryCode}`
  };
};

export const checkSwapEligibility = async (userId: string, vehicleId: string) => {
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, userId, isDeleted: false },
    include: {
      batteryAssignments: {
        where: { active: true },
        include: { battery: true }
      }
    }
  });

  if (!vehicle) throw new AppError("Không tìm thấy xe", 404);

  const activeBooking = await prisma.booking.findFirst({
    where: {
      vehicleId,
      status: { in: ["CREATED", "PENDING_APPROVAL", "APPROVED", "CHECKED_IN"] }
    }
  });

  if (activeBooking) {
    return {
      eligible: false,
      reason: "Vehicle already has an active battery swap booking"
    };
  }

  const assignment = vehicle.batteryAssignments[0];
  if (!assignment || !assignment.battery) {
    return {
      eligible: false,
      reason: "Vehicle has no active battery assigned"
    };
  }

  return {
    eligible: true
  };
};
