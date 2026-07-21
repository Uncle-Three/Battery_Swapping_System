import { StationAssignmentRole } from "@prisma/client";
import { z } from "zod";
import { objectIdSchema } from "../../common/validation/object-id";

export const createStationAssignmentSchema = z.object({
  userId: objectIdSchema,
  stationId: objectIdSchema,
  assignmentRole: z.enum(StationAssignmentRole),
  shift: z.string().trim().min(2).max(50).optional(),
  effectiveFrom: z.coerce.date().optional(),
  effectiveTo: z.coerce.date().optional(),
}).refine((data) => !data.effectiveTo || !data.effectiveFrom || data.effectiveTo > data.effectiveFrom, {
  message: "effectiveTo must be after effectiveFrom",
  path: ["effectiveTo"],
});

export const stationAssignmentParamsSchema = z.object({ id: objectIdSchema });
