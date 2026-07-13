import type { RequestHandler } from "express";
import { vehicleModelService } from "./vehicle-model.service";

export const vehicleModelController = {
  list: (async (_req, res) => {
    const data = await vehicleModelService.list();
    res.status(200).json({ success: true, data });
  }) satisfies RequestHandler,

  getById: (async (req, res) => {
    const data = await vehicleModelService.getById(String(req.params.id));
    res.status(200).json({ success: true, data });
  }) satisfies RequestHandler,

  create: (async (req, res) => {
    const data = await vehicleModelService.create(req.body);
    res.locals.audit = { action: "CREATE_VEHICLE_MODEL", entityType: "VehicleModel", entityId: data.id, after: data };
    res.status(201).json({ success: true, data });
  }) satisfies RequestHandler,

  update: (async (req, res) => {
    const oldData = await vehicleModelService.getById(String(req.params.id));
    const data = await vehicleModelService.update(String(req.params.id), req.body);
    res.locals.audit = { action: "UPDATE_VEHICLE_MODEL", entityType: "VehicleModel", entityId: data.id, before: oldData, after: data };
    res.status(200).json({ success: true, data });
  }) satisfies RequestHandler,

  delete: (async (req, res) => {
    const oldData = await vehicleModelService.getById(String(req.params.id));
    await vehicleModelService.delete(String(req.params.id));
    res.locals.audit = { action: "DELETE_VEHICLE_MODEL", entityType: "VehicleModel", entityId: String(req.params.id), before: oldData };
    res.status(200).json({ success: true });
  }) satisfies RequestHandler,
};
