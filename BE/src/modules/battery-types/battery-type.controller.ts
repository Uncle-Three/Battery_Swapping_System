import type { RequestHandler } from "express";
import { batteryTypeService } from "./battery-type.service";

export const batteryTypeController = {
  list: (async (_req, res) => {
    const data = await batteryTypeService.list();
    res.status(200).json({ success: true, data });
  }) satisfies RequestHandler,

  getById: (async (req, res) => {
    const data = await batteryTypeService.getById(String(req.params.id));
    res.status(200).json({ success: true, data });
  }) satisfies RequestHandler,

  create: (async (req, res) => {
    const data = await batteryTypeService.create(req.body);
    res.locals.audit = { action: "CREATE_BATTERY_TYPE", entityType: "BatteryType", entityId: data.id, after: data };
    res.status(201).json({ success: true, data });
  }) satisfies RequestHandler,

  update: (async (req, res) => {
    const oldData = await batteryTypeService.getById(String(req.params.id));
    const data = await batteryTypeService.update(String(req.params.id), req.body);
    res.locals.audit = { action: "UPDATE_BATTERY_TYPE", entityType: "BatteryType", entityId: data.id, before: oldData, after: data };
    res.status(200).json({ success: true, data });
  }) satisfies RequestHandler,

  delete: (async (req, res) => {
    const oldData = await batteryTypeService.getById(String(req.params.id));
    await batteryTypeService.delete(String(req.params.id));
    res.locals.audit = { action: "DELETE_BATTERY_TYPE", entityType: "BatteryType", entityId: String(req.params.id), before: oldData };
    res.status(200).json({ success: true });
  }) satisfies RequestHandler,
};
