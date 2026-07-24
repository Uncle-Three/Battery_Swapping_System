import { z } from "zod";
import { isDateOnly, isTimeOnly, vietnamToday } from "../../common/utils/vietnam-time";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid MongoDB ObjectId");
const dateOnly = z.string().refine(isDateOnly, "Invalid date; expected YYYY-MM-DD");
const timeOnly = z.string().refine(isTimeOnly, "Invalid time; expected HH:mm");
const initialStatus = z.enum(["AVAILABLE", "OFF", "BLOCKED"]);
const targetStatus = z.enum(["AVAILABLE", "OFF", "BLOCKED"]);

const slotFields = {
  bayId: objectId,
  date: dateOnly,
  startTime: timeOnly,
  endTime: timeOnly,
  status: initialStatus.default("AVAILABLE"),
  reason: z.string().trim().max(300).optional(),
};

const validateSlotItem = (
  value: { startTime: string; endTime: string; status: "AVAILABLE" | "OFF" | "BLOCKED"; reason?: string },
  context: z.RefinementCtx,
) => {
  if (value.startTime >= value.endTime) context.addIssue({ code: "custom", path: ["endTime"], message: "End time must be after start time" });
  if (value.status === "BLOCKED" && !value.reason) context.addIssue({ code: "custom", path: ["reason"], message: "Blocked reason is required" });
};

const slotItem = z.object(slotFields).superRefine(validateSlotItem);

export const stationParamSchema = z.object({ stationId: objectId });
export const bayParamSchema = z.object({ bayId: objectId });
export const slotParamSchema = z.object({ slotId: objectId });

export const bulkCreateSchema = z.object({
  bayIds: z.array(objectId).min(1),
  dateFrom: dateOnly,
  dateTo: dateOnly,
  daysOfWeek: z.array(z.number().int().min(0).max(6)).min(1),
  openingTime: timeOnly,
  closingTime: timeOnly,
  slotDurationMinutes: z.number().int().positive().max(720),
  bufferMinutes: z.number().int().min(0).max(720),
  note: z.string().trim().max(500).nullable().optional(),
  slots: z.array(slotItem).optional(),
}).superRefine((value, context) => {
  if (new Set(value.bayIds).size !== value.bayIds.length) context.addIssue({ code: "custom", path: ["bayIds"], message: "Bay IDs must be unique" });
  if (value.dateFrom < vietnamToday()) context.addIssue({ code: "custom", path: ["dateFrom"], message: "Date range cannot start in the past" });
  if (value.dateFrom > value.dateTo) context.addIssue({ code: "custom", path: ["dateTo"], message: "dateTo must be on or after dateFrom" });
  const days = (Date.parse(`${value.dateTo}T00:00:00Z`) - Date.parse(`${value.dateFrom}T00:00:00Z`)) / 86_400_000;
  if (days > 89) context.addIssue({ code: "custom", path: ["dateTo"], message: "Date range cannot exceed 90 days" });
  if (value.openingTime >= value.closingTime) context.addIssue({ code: "custom", path: ["closingTime"], message: "Closing time must be after opening time" });
});

export const createSingleSchema = z.object({
  date: slotFields.date,
  startTime: slotFields.startTime,
  endTime: slotFields.endTime,
  status: slotFields.status,
  reason: slotFields.reason,
  note: z.string().trim().max(500).optional(),
}).superRefine(validateSlotItem);

export const listSchema = z.object({
  date: dateOnly,
  bayId: objectId.optional(),
  status: z.enum(["AVAILABLE", "OFF", "RESERVED", "CHECKED_IN", "IN_PROGRESS", "COMPLETED", "BLOCKED", "CANCELLED", "EXPIRED"]).optional(),
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const statusSchema = z.object({
  status: targetStatus,
  reason: z.string().trim().max(300).optional(),
}).superRefine((value, context) => {
  if (value.status === "BLOCKED" && !value.reason) context.addIssue({ code: "custom", path: ["reason"], message: "Blocked reason is required" });
});

export const bulkStatusSchema = statusSchema.and(z.object({
  slotIds: z.array(objectId).min(1).max(500).refine((ids) => new Set(ids).size === ids.length, "Slot IDs must be unique"),
}));

export const availableQuerySchema = z.object({ date: dateOnly });

export type BulkCreateInput = z.infer<typeof bulkCreateSchema>;
export type SingleCreateInput = z.infer<typeof createSingleSchema>;
export type StatusInput = z.infer<typeof statusSchema>;
