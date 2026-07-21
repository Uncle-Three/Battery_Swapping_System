import type { RequestHandler } from "express";
import { batteryHealthService } from "./battery-health.service";

export const batteryHealthController = {
  recordTelemetry: (async (req, res) => {
    const data = await batteryHealthService.recordTelemetry(String(req.params.id), req.body, req.user!);
    res.status(201).json({ success: true, data });
  }) as RequestHandler,
  getHealth: (async (req, res) => {
    const data = await batteryHealthService.getHealth(String(req.params.id), req.user!);
    res.json({ success: true, data });
  }) as RequestHandler,
};
