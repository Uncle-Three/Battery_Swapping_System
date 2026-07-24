import { batteryRepository } from "./battery.repository";
import type { CreateBatteryInput } from "./battery.validation";
import { ConflictError } from "../../common/errors/conflict-error";
import { BadRequestError } from "../../common/errors/bad-request-error";
import { ForbiddenError } from "../../common/errors/forbidden-error";

export const batteryService = {
  list: () => batteryRepository.findMany(),
  listFaulty: () => batteryRepository.findFaulty(),
  getById: (id: string) => batteryRepository.findById(id),

  createBattery: async (userId: string, userRole: string, data: CreateBatteryInput) => {
    const batteryCode = data.code.trim().toUpperCase();
    const serialNumber = (data.serialNumber?.trim() || batteryCode).toUpperCase();

    // 1. Uniqueness check for code and serialNumber
    const existing = await batteryRepository.findByCodeOrSerialNumber(batteryCode, serialNumber);
    if (existing) {
      throw new ConflictError("Mã pin hoặc số serial đã tồn tại trong hệ thống.");
    }

    // 2. Battery type existence check
    const batteryType = await batteryRepository.findBatteryTypeById(data.batteryTypeId, data.vehicleModelId);
    if (!batteryType) {
      throw new BadRequestError("Loại pin không tồn tại trong hệ thống.");
    }

    // 3. Station existence check
    const station = await batteryRepository.findStationById(data.stationId);
    if (!station) {
      throw new BadRequestError("Trạm lưu trữ không tồn tại.");
    }

    // 4. Station authorization check for logged-in user
    const isAuthorized = await batteryRepository.checkUserStationAuthorization(userId, data.stationId, userRole);
    if (!isAuthorized) {
      throw new ForbiddenError("Bạn không có quyền thêm pin vào trạm này.");
    }

    // 5. Default attributes
    const manufacturer = "VinES";
    const storageLocation = data.storageLocation?.trim() || "Kho trạm";
    const ratedCapacityAh = data.ratedCapacityAh || batteryType.capacityKWh || 100;
    const ratedVoltage = data.ratedVoltage || batteryType.nominalVoltage || 400;

    // 6. Create Battery atomically with BatteryMovement and AuditLog
    const battery = await batteryRepository.createBatteryWithTransaction(userId, userRole, {
      ...data,
      batteryTypeId: batteryType.id,
      stationId: station.id,
      code: batteryCode,
      serialNumber,
      manufacturer,
      storageLocation,
      ratedCapacityAh,
      ratedVoltage,
    });

    return {
      id: battery.id,
      code: battery.batteryCode,
      serialNumber: battery.serialNumber,
      batteryTypeId: battery.batteryTypeId,
      manufacturer: battery.manufacturer,
      ratedCapacityAh: battery.ratedCapacityAh,
      ratedVoltage: battery.ratedVoltage,
      soh: 100,
      soc: battery.soc,
      cycleCount: 0,
      accumulatedDistance: 0,
      condition: "NEW",
      status: "AVAILABLE",
      stationId: battery.stationId,
      storageLocation: battery.storageLocation,
      manufacturedAt: battery.manufacturedAt,
      receivedAt: battery.receivedAt,
      note: battery.note,
      createdAt: battery.createdAt,
    };
  },
};
