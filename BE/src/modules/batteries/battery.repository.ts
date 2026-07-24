import { prisma } from "../../config/database";
import type { CreateBatteryInput } from "./battery.validation";

export const batteryRepository = {
  findMany: async () => {
    return prisma.battery.findMany({
      include: {
        batteryType: true,
        station: true,
      },
      orderBy: { createdAt: "desc" },
    });
  },

  findFaulty: async () => {
    return prisma.battery.findMany({
      where: {
        OR: [
          { safetyState: "UNSAFE" },
          { operationalStatus: "MAINTENANCE" },
          { status: "FAULTY" },
        ],
      },
      include: {
        batteryType: true,
        station: true,
      },
    });
  },

  findById: async (id: string) => {
    return prisma.battery.findUnique({
      where: { id },
      include: {
        batteryType: true,
        station: true,
      },
    });
  },

  findByCodeOrSerialNumber: async (code: string, serialNumber: string) => {
    return prisma.battery.findFirst({
      where: {
        OR: [
          { batteryCode: code.toUpperCase() },
          { serialNumber: serialNumber.toUpperCase() },
        ],
      },
    });
  },

  findBatteryTypeById: async (idOrCode: string, vehicleModelInput?: string) => {
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(idOrCode);
    let batteryType = await prisma.batteryType.findFirst({
      where: {
        OR: [
          ...(isObjectId ? [{ id: idOrCode }] : []),
          { code: { equals: idOrCode, mode: "insensitive" } },
        ],
      },
    });

    if (!batteryType) {
      const code = idOrCode || "VF8_LARGE";
      const existing = await prisma.batteryType.findFirst({
        where: { code: { equals: code, mode: "insensitive" } },
      });
      if (existing) {
        batteryType = existing;
      } else {
        const capacityKWh = code.includes("18") ? 18.5 : code.includes("37") ? 37.2 : code.includes("42") ? 42 : code.includes("59") ? 59.6 : code.includes("70") ? 75.3 : 82.0;
        batteryType = await prisma.batteryType.create({
          data: {
            code,
            capacityKWh,
            nominalVoltage: 400,
            manufacturer: "VinES",
            chemistry: code.includes("LIION") ? "LITHIUM_ION" : "LFP",
            connectorType: "STANDARD",
            batteryClass: "STANDARD",
          },
        });
      }
    }

    if (batteryType) {
      try {
        let modelNames: string[] = [];
        if (vehicleModelInput) {
          const isObjId = /^[0-9a-fA-F]{24}$/.test(vehicleModelInput);
          if (isObjId) {
            const vm = await prisma.vehicleModel.findUnique({ where: { id: vehicleModelInput } });
            if (vm) modelNames.push(vm.name);
          } else {
            modelNames.push(vehicleModelInput);
          }
        }

        if (modelNames.length === 0) {
          const c = batteryType.code;
          if (c.includes("VF3")) modelNames = ["VF 3"];
          else if (c.includes("VF5")) modelNames = ["VF 5"];
          else if (c.includes("VFE34")) modelNames = ["VF e34"];
          else if (c.includes("VF6")) modelNames = ["VF 6 Eco", "VF 6 Plus"];
          else if (c.includes("VF7_59")) modelNames = ["VF 7 Eco"];
          else if (c.includes("VF7_70")) modelNames = ["VF 7 Plus"];
          else if (c.includes("VF8")) modelNames = ["VF 8 Eco", "VF 8 Plus"];
          else if (c.includes("VF9")) modelNames = ["VF 9 Eco", "VF 9 Plus"];
        }

        for (const name of modelNames) {
          let vm = await prisma.vehicleModel.findFirst({
            where: { name: { equals: name, mode: "insensitive" } },
          });
          if (!vm) {
            vm = await prisma.vehicleModel.create({
              data: {
                manufacturer: "VinFast",
                name,
                connectorType: "STANDARD",
                nominalVoltage: 400,
                batteryClass: "STANDARD",
              },
            });
          }

          const comp = await prisma.batteryCompatibility.findFirst({
            where: { vehicleModelId: vm.id, batteryTypeId: batteryType.id },
          });

          if (!comp) {
            await prisma.batteryCompatibility.create({
              data: {
                vehicleModelId: vm.id,
                batteryTypeId: batteryType.id,
                connectorType: "STANDARD",
                nominalVoltage: 400,
                minimumCapacityKWh: 10,
                maximumCapacityKWh: 200,
                batteryClass: "STANDARD",
                active: true,
              },
            });
          }
        }
      } catch (err) {
        // Non-blocking catch for compatibility link
      }
    }

    return batteryType;
  },

  findStationById: async (idOrCode: string) => {
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(idOrCode);
    return prisma.station.findFirst({
      where: {
        OR: [
          ...(isObjectId ? [{ id: idOrCode }] : []),
          { code: idOrCode },
        ],
      },
    });
  },

  checkStorageLocationConflict: async (stationId: string, storageLocation: string) => {
    return prisma.battery.findFirst({
      where: {
        stationId,
        storageLocation: {
          equals: storageLocation.trim(),
          mode: "insensitive",
        },
        operationalStatus: {
          in: ["AVAILABLE", "RESERVED", "INSPECTION_REQUIRED", "MAINTENANCE"],
        },
      },
    });
  },

  checkUserStationAuthorization: async (userId: string, stationId: string, role: string) => {
    if (role === "ADMIN") return true;

    const assignment = await prisma.stationAssignment.findFirst({
      where: {
        userId,
        stationId,
        active: true,
        OR: [{ effectiveTo: null }, { effectiveTo: { gt: new Date() } }],
      },
    });

    return !!assignment;
  },

  createBatteryWithTransaction: async (
    userId: string,
    userRole: string,
    data: CreateBatteryInput
  ) => {
    return prisma.$transaction(async (tx) => {
      const newBattery = await tx.battery.create({
        data: {
          batteryCode: data.code,
          serialNumber: data.serialNumber,
          batteryTypeId: data.batteryTypeId,
          manufacturer: data.manufacturer,
          ratedCapacityAh: data.ratedCapacityAh,
          ratedVoltage: data.ratedVoltage,
          voltage: data.ratedVoltage,
          soc: data.soc,
          soh: 100,
          cycleCount: 0,
          accumulatedMileageKm: 0,
          accumulatedDistance: 0,
          condition: "NEW",
          safetyState: "SAFE",
          operationalStatus: "AVAILABLE",
          status: "READY",
          stationId: data.stationId,
          storageLocation: data.storageLocation,
          manufacturedAt: data.manufacturedAt,
          manufacturedDate: data.manufacturedAt,
          receivedAt: data.receivedAt,
          note: data.note ?? null,
          createdById: userId,
          currentVehicleId: null,
          reservedForSwapId: null,
        },
        include: {
          batteryType: true,
          station: true,
        },
      });

      await tx.batteryMovement.create({
        data: {
          batteryId: newBattery.id,
          movementType: "NEW_BATTERY_RECEIVED",
          fromLocation: "SUPPLIER",
          toStationId: data.stationId,
          toLocation: data.storageLocation,
          performedBy: userId,
          note: "Pin mới được nhập vào kho",
        },
      });

      await tx.auditLog.create({
        data: {
          action: "CREATE_NEW_BATTERY",
          entityType: "Battery",
          entityId: newBattery.id,
          actorId: userId,
          actorRole: userRole,
          stationId: data.stationId,
          details: `Created new battery ${newBattery.batteryCode} (serial: ${newBattery.serialNumber}) in station warehouse at location ${data.storageLocation}`,
          after: {
            id: newBattery.id,
            code: newBattery.batteryCode,
            serialNumber: newBattery.serialNumber,
            soh: 100,
            soc: data.soc,
            cycleCount: 0,
            accumulatedDistance: 0,
            condition: "NEW",
            status: "AVAILABLE",
            stationId: data.stationId,
            storageLocation: data.storageLocation,
          },
        },
      });

      return newBattery;
    });
  },
};
