import type { RequestHandler } from "express";
import { batterySlotService } from "./battery-slot.service";

export const batterySlotController = {
  list: (async (_req, res) => {
    const data = await batterySlotService.list();
    res.status(200).json({ success: true, data });
  }) satisfies RequestHandler,

  getById: (async (req, res) => {
    const data = await batterySlotService.getById(String(req.params.id));
    res.status(200).json({ success: true, data });
  }) satisfies RequestHandler,
};
