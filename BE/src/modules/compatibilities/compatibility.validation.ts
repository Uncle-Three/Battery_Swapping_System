import { z } from "zod";
import { objectIdSchema } from "../../common/validation/object-id";

export const createCompatibilitySchema = z.object({
  vehicleModelId: objectIdSchema,
  batteryTypeId: objectIdSchema,
  active: z.boolean().default(true),
});

export const updateCompatibilitySchema = createCompatibilitySchema.partial();
