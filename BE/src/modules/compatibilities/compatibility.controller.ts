import type { RequestHandler } from "express";
import { compatibilityService } from "./compatibility.service";

export const compatibilityController = {
  list: (async (_req, res) => {
    const data = await compatibilityService.list();
    res.status(200).json({ success: true, data });
  }) satisfies RequestHandler,

  getById: (async (req, res) => {
    const data = await compatibilityService.getById(String(req.params.id));
    res.status(200).json({ success: true, data });
  }) satisfies RequestHandler,

  create: (async (req, res) => {
    // connect format for Prisma
    const input = {
      active: req.body.active,
      vehicleModel: { connect: { id: req.body.vehicleModelId } },
      batteryType: { connect: { id: req.body.batteryTypeId } },
    };
    const data = await compatibilityService.create(input);
    res.locals.audit = { action: "CREATE_COMPATIBILITY", entityType: "BatteryCompatibility", entityId: data.id, after: data };
    res.status(201).json({ success: true, data });
  }) satisfies RequestHandler,

  update: (async (req, res) => {
    const oldData = await compatibilityService.getById(String(req.params.id));
    const input: any = {};
    if (req.body.active !== undefined) input.active = req.body.active;
    if (req.body.vehicleModelId) input.vehicleModel = { connect: { id: req.body.vehicleModelId } };
    if (req.body.batteryTypeId) input.batteryType = { connect: { id: req.body.batteryTypeId } };

    const data = await compatibilityService.update(String(req.params.id), input);
    res.locals.audit = { action: "UPDATE_COMPATIBILITY", entityType: "BatteryCompatibility", entityId: data.id, before: oldData, after: data };
    res.status(200).json({ success: true, data });
  }) satisfies RequestHandler,

  delete: (async (req, res) => {
    const oldData = await compatibilityService.getById(String(req.params.id));
    await compatibilityService.delete(String(req.params.id));
    res.locals.audit = { action: "DELETE_COMPATIBILITY", entityType: "BatteryCompatibility", entityId: String(req.params.id), before: oldData };
    res.status(200).json({ success: true });
  }) satisfies RequestHandler,
};
