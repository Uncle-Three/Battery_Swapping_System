import { z } from "zod";
import { objectIdSchema } from "../../common/validation/object-id";

export const createSafetyRuleSchema = z.object({
  stationId: objectIdSchema.optional().nullable(),
  version: z.number().int().positive(),
  minimumSohSafe: z.number().min(0).max(100),
  minimumSohWarning: z.number().min(0).max(100),
  minimumSoc: z.number().min(0).max(100),
  maximumTemperature: z.number(),
  minimumVoltage: z.number(),
  maximumVoltage: z.number(),
  effectiveFrom: z.coerce.date(),
  effectiveTo: z.coerce.date().optional().nullable(),
  active: z.boolean().default(true),
});

export const updateSafetyRuleSchema = createSafetyRuleSchema.partial();
