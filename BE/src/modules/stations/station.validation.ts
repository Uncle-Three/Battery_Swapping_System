import { z } from "zod";

export const stationIdParamSchema = z.object({
  id: z.string().min(1),
});

