import type { RequestHandler } from "express";
import { batteryService } from "./battery.service";
import { UnauthorizedError } from "../../common/errors/unauthorized-error";

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

  create: (async (req, res, next) => {
    try {
      if (!req.user) {
        throw new UnauthorizedError("Authentication required");
      }
      const data = await batteryService.createBattery(req.user.id, req.user.role, req.body);
      res.status(201).json({
        success: true,
        message: "Đã thêm pin mới vào kho thành công.",
        data,
      });
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,
};
