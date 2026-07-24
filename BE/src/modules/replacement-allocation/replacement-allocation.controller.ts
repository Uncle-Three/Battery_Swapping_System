import type { Request, Response, NextFunction } from "express";
import { replacementAllocationService } from "./replacement-allocation.service";

export const replacementAllocationController = {
  getCandidates: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const swapId = req.params.swapId as string;
      const user = (req as any).user;
      const result = await replacementAllocationService.getCandidates(swapId, user.id as string, user.role as string);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  reserve: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const swapId = req.params.swapId as string;
      const batteryId = req.body.batteryId as string;
      const user = (req as any).user;
      const result = await replacementAllocationService.reserve(swapId, batteryId, user.id as string, user.role as string);
      res.json({ success: true, message: "Đã giữ pin cho giao dịch thành công.", data: result });
    } catch (error) {
      next(error);
    }
  },

  cancelReservation: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const swapId = req.params.swapId as string;
      const user = (req as any).user;
      const result = await replacementAllocationService.cancelReservation(swapId, user.id as string, user.role as string);
      res.json({ success: true, message: "Đã hủy giữ pin cho giao dịch.", data: result });
    } catch (error) {
      next(error);
    }
  },

  verifyQr: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const swapId = req.params.swapId as string;
      const scannedValue = req.body.scannedValue as string;
      const user = (req as any).user;
      const result = await replacementAllocationService.verifyQr(swapId, scannedValue, user.id as string, user.role as string);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  install: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const swapId = req.params.swapId as string;
      const user = (req as any).user;
      const result = await replacementAllocationService.install(swapId, user.id as string, user.role as string);
      res.json({ success: true, message: "Đã lắp pin thay thế thành công.", data: result });
    } catch (error) {
      next(error);
    }
  },

  reportShortage: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const swapId = req.params.swapId as string;
      const reason = req.body.reason as string;
      const user = (req as any).user;
      const result = await replacementAllocationService.reportShortage(swapId, reason, user.id as string, user.role as string);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  getStatus: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const swapId = req.params.swapId as string;
      const user = (req as any).user;
      const result = await replacementAllocationService.getStatus(swapId, user.id as string, user.role as string);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
};
