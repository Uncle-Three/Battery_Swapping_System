import { z } from "zod";
import { objectIdSchema } from "../../common/validation/object-id";

export const rejectBookingSchema = z.object({ reason: z.string().trim().min(3).max(500) }).strict();

export const proposeRescheduleSchema = z.object({
  slotId: objectIdSchema,
  scheduledStart: z.coerce.date(),
  scheduledEnd: z.coerce.date(),
  reason: z.string().trim().min(3).max(500),
}).strict().superRefine((data, context) => {
  if (data.scheduledStart <= new Date()) context.addIssue({ code: "custom", path: ["scheduledStart"], message: "Schedule must be in the future" });
  if (data.scheduledStart.getMinutes() !== 0 || data.scheduledStart.getSeconds() !== 0) context.addIssue({ code: "custom", path: ["scheduledStart"], message: "Schedule must start on the hour" });
  if (data.scheduledEnd.getTime() - data.scheduledStart.getTime() !== 60 * 60_000) context.addIssue({ code: "custom", path: ["scheduledEnd"], message: "Schedule must be exactly one hour" });
});

export type ProposeRescheduleInput = z.infer<typeof proposeRescheduleSchema>;
