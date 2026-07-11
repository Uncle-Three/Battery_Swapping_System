import type { RequestHandler } from "express";
import { stationService } from "./station.service";

export const stationController = {
  list: (async (_req, res) => {
    const data = await stationService.list();
    res.status(200).json({ success: true, data });
  }) satisfies RequestHandler,

  getById: (async (req, res) => {
    const data = await stationService.getById(String(req.params.id));
    res.status(200).json({ success: true, data });
  }) satisfies RequestHandler,

  getSlots: (async (req, res) => {
    const data = await stationService.getSlots(String(req.params.id));
    res.status(200).json({ success: true, data });
  }) satisfies RequestHandler,
};
