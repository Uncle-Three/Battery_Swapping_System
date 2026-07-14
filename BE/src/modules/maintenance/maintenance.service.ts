import { BatteryStatus } from "@prisma/client";
import { maintenanceRepository, type CreateMaintenanceRecordInput } from "./maintenance.repository";
import { emailService } from "../email/email.service";

const maintenanceStatusText = (status: BatteryStatus) => {
  if (status === BatteryStatus.MAINTENANCE) return "Dang sua";
  if (status === BatteryStatus.READY) return "Hoan tat";
  if (status === BatteryStatus.FAULTY) return "Can xu ly them";
  return status;
};

export const maintenanceService = {
  create: async (input: CreateMaintenanceRecordInput) => {
    const record = await maintenanceRepository.create(input);
    const owner = record.battery.vehicleAssignments[0]?.vehicle.user;
    const shouldNotify = record.status === BatteryStatus.MAINTENANCE || record.status === BatteryStatus.READY || record.status === BatteryStatus.FAULTY;
    if (owner && shouldNotify) {
      await emailService.sendMaintenanceStatusChanged({
        customerName: owner.fullName,
        customerEmail: owner.email,
        serialNumber: record.battery.serialNumber,
        status: maintenanceStatusText(record.status),
        notes: record.notes,
      });
    }
    return record;
  },

  list: () => maintenanceRepository.findMany(),
};
