import { z } from "zod";
import { BatteryStatus } from "../../constants/battery-status";

export const createMaintenanceRecordSchema = z.object({
  batteryId: z.string().min(1),
  soh: z.coerce.number().min(0).max(100),
  soc: z.coerce.number().min(0).max(100),
  status: z.enum([
    BatteryStatus.READY,
    BatteryStatus.CHARGING,
    BatteryStatus.MAINTENANCE,
    BatteryStatus.FAULTY,
  ]),
  notes: z.string().optional(),
});

