import { z } from "zod";
import { objectIdSchema } from "../../common/validation/object-id";

export const stationParamSchema = z.object({ stationId: objectIdSchema });
export const bayParamSchema = z.object({ stationId: objectIdSchema, bayId: objectIdSchema });
export const slotParamSchema = z.object({ stationId: objectIdSchema, slotId: objectIdSchema });
export const assignmentParamSchema = z.object({ stationId: objectIdSchema, assignmentId: objectIdSchema });
export const maintenanceParamSchema = z.object({ stationId: objectIdSchema, maintenanceId: objectIdSchema });

export const createBaySchema = z.object({
  bayCode: z.string().trim().min(1).max(30), bayName: z.string().trim().min(1).max(100),
  status: z.enum(["AVAILABLE", "IN_USE", "MAINTENANCE", "INACTIVE"]).default("AVAILABLE"),
  defaultDurationMinutes: z.number().int().min(5).max(240).default(30), description: z.string().trim().max(500).optional().nullable(),
});
export const updateBaySchema = createBaySchema.partial().refine((value) => Object.keys(value).length > 0, "At least one field is required");

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must use HH:mm format");
const slotFieldsSchema = z.object({
  bayId: objectIdSchema, date: z.coerce.date(), startTime: time, endTime: time,
  capacity: z.number().int().min(1).max(100), status: z.enum(["AVAILABLE", "FULL", "TEMPORARILY_RESERVED", "BLOCKED", "MAINTENANCE", "CANCELLED", "COMPLETED"]).default("AVAILABLE"),
  recurrence: z.record(z.string(), z.unknown()).optional().nullable(),
});
export const createSlotSchema = slotFieldsSchema.refine((value) => value.startTime < value.endTime, { path: ["endTime"], message: "Start time must be earlier than end time" });
export const updateSlotSchema = slotFieldsSchema.partial()
  .refine((value) => Object.keys(value).length > 0, "At least one field is required")
  .refine((value) => !value.startTime || !value.endTime || value.startTime < value.endTime, { path: ["endTime"], message: "Start time must be earlier than end time" });
export const slotsQuerySchema = z.object({ from: z.coerce.date().optional(), to: z.coerce.date().optional(), view: z.enum(["day", "week"]).default("day") });

export const inventoryQuerySchema = z.object({ search: z.string().optional(), status: z.string().optional(), safetyState: z.string().optional(), page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20) });
export const batteryParamSchema = z.object({ stationId: objectIdSchema, batteryId: objectIdSchema });
export const inventoryActionSchema = z.object({
  action: z.enum(["ADD", "TRANSFER", "INSPECTION_REQUIRED", "MAINTENANCE"]),
  targetStationId: objectIdSchema.optional(), reason: z.string().trim().min(3).max(500),
}).refine((value) => value.action !== "TRANSFER" || Boolean(value.targetStationId), { path: ["targetStationId"], message: "Target station is required" });
export const bookingsQuerySchema = z.object({ search: z.string().optional(), status: z.string().optional(), from: z.coerce.date().optional(), to: z.coerce.date().optional(), page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20) });

export const createAssignmentSchema = z.object({ userId: objectIdSchema, assignmentRole: z.enum(["MANAGER", "STAFF", "TECHNICIAN"]), shift: z.string().trim().max(100).optional().nullable(), effectiveFrom: z.coerce.date().optional(), effectiveTo: z.coerce.date().optional() });
export const updateAssignmentSchema = z.object({ shift: z.string().trim().max(100).optional().nullable(), active: z.boolean().optional(), effectiveFrom: z.coerce.date().optional(), effectiveTo: z.coerce.date().optional() }).refine((value) => Object.keys(value).length > 0, "At least one field is required");

export const createMaintenanceSchema = z.object({
  type: z.enum(["STATION_MAINTENANCE", "BAY_MAINTENANCE", "BATTERY_MAINTENANCE", "INCIDENT"]),
  relatedEntityId: z.string().optional().nullable(), relatedEntityLabel: z.string().max(120).optional().nullable(),
  title: z.string().trim().min(1).max(150), description: z.string().trim().min(1).max(2000),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]), assignedStaffId: objectIdSchema.optional().nullable(),
  startTime: z.coerce.date().optional(), expectedCompletion: z.coerce.date().optional().nullable(),
});
export const updateMaintenanceSchema = z.object({ status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CANCELLED"]).optional(), assignedStaffId: objectIdSchema.optional().nullable(), expectedCompletion: z.coerce.date().optional().nullable(), resolution: z.string().trim().max(2000).optional().nullable() }).refine((value) => Object.keys(value).length > 0, "At least one field is required");
export const maintenanceQuerySchema = z.object({ search: z.string().optional(), status: z.string().optional(), type: z.string().optional(), page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20) });
export const reportQuerySchema = z.object({ from: z.coerce.date().optional(), to: z.coerce.date().optional(), bayId: objectIdSchema.optional(), bookingStatus: z.string().optional() });
export const auditQuerySchema = z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(25) });
