import { z } from "zod";

export const createVehicleModelSchema = z.object({
  manufacturer: z.string().min(1),
  name: z.string().min(1),
  modelYear: z.number().int().optional().nullable(),
  connectorType: z.string().min(1),
  nominalVoltage: z.number().positive(),
  batteryClass: z.string().min(1),
});

export const updateVehicleModelSchema = createVehicleModelSchema.partial();
