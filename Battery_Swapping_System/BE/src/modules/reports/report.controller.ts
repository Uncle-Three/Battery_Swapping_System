import type { RequestHandler } from "express";
import { reportService } from "./report.service";

export const reportController = {
  analytics: (async (req, res) => {
    const data = await reportService.analytics(req.user!.id, req.user!.role, req.query.period?.toString());
    res.status(200).json({ success: true, data });
  }) satisfies RequestHandler,

  inventory: (async (req, res) => {
    const data = await reportService.inventory(req.user!.id, req.user!.role);
    res.status(200).json({ success: true, data });
  }) satisfies RequestHandler,
};
