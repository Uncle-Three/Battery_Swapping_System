import { z } from "zod";
import { BatteryStatus } from "../../constants/battery-status";

export const updateBatteryStatusSchema = z.object({
  status: z.enum([
    BatteryStatus.READY,
    BatteryStatus.CHARGING,
    BatteryStatus.MAINTENANCE,
    BatteryStatus.FAULTY,
  ]),
});

