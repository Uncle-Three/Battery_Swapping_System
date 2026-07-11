import type { RequestHandler } from "express";
import { batteryService } from "./battery.service";

export const batteryController = {
  list: (async (_req, res) => {
    const data = await batteryService.list();
    res.status(200).json({ success: true, data });
  }) satisfies RequestHandler,

  listFaulty: (async (_req, res) => {
    const data = await batteryService.listFaulty();
    res.status(200).json({ success: true, data });
  }) satisfies RequestHandler,

  getById: (async (req, res) => {
    const data = await batteryService.getById(String(req.params.id));
    res.status(200).json({ success: true, data });
  }) satisfies RequestHandler,
};
