import { z } from "zod";
import { objectIdSchema } from "../../common/validation/object-id";

export const createBookingSchema = z.object({
  vehicleId: objectIdSchema,
  stationId: objectIdSchema,
  slotId: objectIdSchema.optional(),
  serviceBayId: objectIdSchema.optional(),
  replacementRequestId: objectIdSchema.optional(),
  startAt: z.coerce.date().optional(),
  endAt: z.coerce.date().optional(),
  scheduledStart: z.coerce.date().optional(),
  scheduledEnd: z.coerce.date().optional(),
  reason: z.string().trim().min(3).max(500).optional(),
}).strict().transform((data) => ({
  ...data,
  scheduledStart: data.startAt ?? data.scheduledStart,
  scheduledEnd: data.endAt ?? data.scheduledEnd,
})).superRefine((data, context) => {
  if (!data.scheduledStart) context.addIssue({ code: "custom", path: ["startAt"], message: "startAt is required" });
  if (!data.scheduledEnd) context.addIssue({ code: "custom", path: ["endAt"], message: "endAt is required" });
  if (!data.scheduledStart || !data.scheduledEnd) return;
  if (data.scheduledEnd <= new Date()) context.addIssue({ code: "custom", path: ["scheduledEnd"], message: "Booking must be in the future" });
  if (data.scheduledEnd <= data.scheduledStart) context.addIssue({ code: "custom", path: ["scheduledEnd"], message: "scheduledEnd must be after scheduledStart" });
  if (![0, 30].includes(data.scheduledStart.getMinutes()) || data.scheduledStart.getSeconds() !== 0) context.addIssue({ code: "custom", path: ["scheduledStart"], message: "Booking must start on a 30-minute boundary" });
  if (![30, 60].includes((data.scheduledEnd.getTime() - data.scheduledStart.getTime()) / 60_000)) context.addIssue({ code: "custom", path: ["scheduledEnd"], message: "Booking duration must be 30 or 60 minutes" });
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
