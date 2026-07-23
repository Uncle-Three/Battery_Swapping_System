import { z } from "zod";

export const batteryTelemetrySchema = z.object({
  soc: z.number().min(0).max(100),
  soh: z.number().min(0).max(100),
  cycleCount: z.number().int().min(0).max(100_000),
  temperature: z.number().min(-40).max(120),
  voltage: z.number().min(100).max(1_000),
  dataSource: z.string().trim().min(1).max(100),
  recordedAt: z.coerce.date().max(new Date(Date.now() + 5 * 60_000)).optional(),
}).strict();

export type BatteryTelemetryInput = z.infer<typeof batteryTelemetrySchema>;
