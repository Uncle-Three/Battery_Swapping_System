import { z } from "zod";
import { objectIdSchema } from "../../common/validation/object-id";

export const bookingLookupSchema = z.object({ bookingId: objectIdSchema, stationId: objectIdSchema }).strict();
export const checkInSchema = z.object({ stationId: objectIdSchema, serviceBayId: objectIdSchema }).strict();
export const serialSchema = z.object({ serialNumber: z.string().trim().min(3).max(100), soc: z.number().int().min(0).max(100).optional(), soh: z.number().int().min(0).max(100).optional() }).strict();
export const removeBatterySchema = z.object({
  serialNumber: z.string().trim().min(3).max(100),
  soc: z.number().int().min(0).max(100),
  soh: z.number().int().min(0).max(100),
}).strict();
export const scanBatterySchema = z.object({ serialNumber: z.string().trim().min(3).max(100) }).strict();
export const inspectionSchema = z.object({
  serialNumber: z.string().trim().min(3).max(100), soc: z.number().int().min(0).max(100), soh: z.number().int().min(0).max(100),
  temperature: z.number().min(-50).max(150).optional(), voltage: z.number().positive().optional(),
  physicalCondition: z.string().trim().min(3).max(500), outcome: z.enum(["AVAILABLE", "MAINTENANCE", "QUARANTINED", "RETIRED"]), notes: z.string().trim().max(1000).optional(),
}).strict();
export const collectPaymentSchema = z.object({ paymentMethod: z.enum(["VNPAY", "CASH"]).optional() }).strict();
export const rollbackSwapSchema = z.object({ reason: z.string().trim().min(3).max(1000) }).strict();
