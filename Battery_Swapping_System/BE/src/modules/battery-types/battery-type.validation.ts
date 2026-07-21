import { z } from "zod";

export const createBatteryTypeSchema = z.object({
  code: z.string().min(1),
  manufacturer: z.string().min(1),
  chemistry: z.string().min(1),
  connectorType: z.string().min(1),
  nominalVoltage: z.number().positive(),
  capacityKWh: z.number().positive(),
  batteryClass: z.string().min(1),
});

export const updateBatteryTypeSchema = createBatteryTypeSchema.partial();
