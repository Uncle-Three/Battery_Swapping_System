import type { RequestHandler } from "express";
import { technicalHistoryService } from "./technical-history.service";

export const technicalHistoryController = {
  getVehicleTechnicalHistory: (async (req, res, next) => {
    try {
      const { page = "0", size = "20" } = req.query as Record<string, string>;
      const vehicleId = req.params.vehicleId as string;
      const result = await technicalHistoryService.getVehicleTechnicalHistory(
        vehicleId,
        req.user!.id,
        req.user!.role,
        { page: parseInt(page), size: parseInt(size) },
      );
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,
};
