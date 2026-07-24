import { z } from "zod";
import { objectIdSchema } from "../../common/validation/object-id";

const optionalNumber = z.coerce.number().nonnegative().optional();
const optionalDate = z.coerce.date().optional();

export const adminVehicleParamsSchema = z.object({ vehicleId: objectIdSchema });

export const adminVehicleListQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  status: z.enum(["ACTIVE", "NEEDS_INSPECTION", "UNSAFE", "SWAP_PENDING", "MAINTENANCE", "TRANSFER_PENDING", "LOCKED", "INACTIVE"]).optional(),
  batterySafety: z.enum(["SAFE", "WARNING", "UNSAFE", "NO_DATA"]).optional(),
  transferStatus: z.enum(["NONE", "PENDING", "UNDER_REVIEW", "NEED_MORE_INFORMATION", "APPROVED", "REJECTED"]).optional(),
  manufacturer: z.string().trim().max(80).optional(),
  model: z.string().trim().max(80).optional(),
  productionYear: z.coerce.number().int().min(1886).max(new Date().getFullYear() + 1).optional(),
  minOdo: optionalNumber,
  maxOdo: optionalNumber,
  minSoh: z.coerce.number().min(0).max(100).optional(),
  maxSoh: z.coerce.number().min(0).max(100).optional(),
  createdFrom: optionalDate,
  createdTo: optionalDate,
  lastInspectionFrom: optionalDate,
  lastInspectionTo: optionalDate,
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().refine((value) => [10, 20, 50, 100].includes(value)).default(10),
  sortBy: z.enum(["createdAt", "currentMileageKm", "soh", "plateNumber", "lastInspectionAt"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
}).refine((value) => value.minOdo === undefined || value.maxOdo === undefined || value.minOdo <= value.maxOdo, { message: "ODO tối thiểu không được lớn hơn ODO tối đa" })
  .refine((value) => value.minSoh === undefined || value.maxSoh === undefined || value.minSoh <= value.maxSoh, { message: "SoH tối thiểu không được lớn hơn SoH tối đa" });

export const lockVehicleSchema = z.object({
  category: z.enum(["OWNERSHIP_DISPUTE", "REPORTED_STOLEN", "FRAUD_SUSPECTED", "INVALID_VIN", "SAFETY_RISK", "OTHER"]),
  reason: z.string().trim().min(5).max(500),
  notes: z.string().trim().max(1000).optional(),
});

export const reasonSchema = z.object({ reason: z.string().trim().min(5).max(500), notes: z.string().trim().max(1000).optional() });

export const maintenanceSchema = reasonSchema.extend({
  stationId: objectIdSchema,
  expectedStartDate: z.coerce.date(),
  expectedCompletionDate: z.coerce.date().optional(),
});

export const identifierCorrectionSchema = z.object({
  field: z.literal("vin"),
  oldValue: z.string().trim().min(1),
  newValue: z.string().trim().min(5).max(50),
  reason: z.string().trim().min(5).max(500),
});

export type AdminVehicleListQuery = z.infer<typeof adminVehicleListQuerySchema>;
export type LockVehicleInput = z.infer<typeof lockVehicleSchema>;
export type ReasonInput = z.infer<typeof reasonSchema>;
export type MaintenanceInput = z.infer<typeof maintenanceSchema>;
export type IdentifierCorrectionInput = z.infer<typeof identifierCorrectionSchema>;
