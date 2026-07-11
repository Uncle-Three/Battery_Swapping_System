import type { RequestHandler } from "express";
import { reportService } from "./report.service";

export const reportController = {
  analytics: (async (req, res) => {
    const data = await reportService.analytics(req.query.period?.toString());
    res.status(200).json({ success: true, data });
  }) satisfies RequestHandler,

  inventory: (async (_req, res) => {
    const data = await reportService.inventory();
    res.status(200).json({ success: true, data });
  }) satisfies RequestHandler,
};

