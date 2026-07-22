import type { RequestHandler } from "express";
import { maintenanceService } from "./maintenance.service";

export const maintenanceController = {
  create: (async (req, res) => {
    const data = await maintenanceService.create({ ...req.body, technicianId: req.user?.id });
    res.status(201).json({ success: true, data });
  }) satisfies RequestHandler,

  list: (async (_req, res) => {
    const data = await maintenanceService.list();
    res.status(200).json({ success: true, data });
  }) satisfies RequestHandler,
};
