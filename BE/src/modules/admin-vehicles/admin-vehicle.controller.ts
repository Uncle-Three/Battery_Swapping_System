import type { NextFunction, Request, Response } from "express";
import * as service from "./admin-vehicle.service";
import type { AdminVehicleListQuery, IdentifierCorrectionInput, LockVehicleInput, MaintenanceInput, ReasonInput } from "./admin-vehicle.validation";

const context = (req: Request, reason: string, notes?: string) => ({ actorId: req.user!.id, reason, notes, ipAddress: req.ip, userAgent: req.get("user-agent") });
const ok = (res: Response, data: unknown) => res.json({ success: true, data });
const handler = (work: (req: Request, res: Response) => Promise<unknown>) => async (req: Request, res: Response, next: NextFunction) => { try { await work(req, res); } catch (error) { next(error); } };

export const list = handler(async (req, res) => { ok(res, await service.listVehicles(req.query as unknown as AdminVehicleListQuery)); });
export const detail = handler(async (req, res) => { ok(res, await service.getVehicleDetail(String(req.params.vehicleId))); });
export const batteryHealth = handler(async (req, res) => { ok(res, await service.getBatteryHealth(String(req.params.vehicleId))); });
export const batteryHealthLogs = handler(async (req, res) => { const health = await service.getBatteryHealth(String(req.params.vehicleId)); ok(res, health?.healthLogs ?? []); });
export const swapHistory = handler(async (req, res) => { ok(res, await service.getSwapHistory(String(req.params.vehicleId))); });
export const maintenanceHistory = handler(async (req, res) => { ok(res, await service.getMaintenanceHistory(String(req.params.vehicleId))); });
export const incidents = handler(async (req, res) => { ok(res, await service.getIncidents(String(req.params.vehicleId))); });
export const ownershipHistory = handler(async (req, res) => { ok(res, await service.getOwnershipHistory(String(req.params.vehicleId))); });
export const transferRequests = handler(async (req, res) => { ok(res, await service.getTransferRequests(String(req.params.vehicleId))); });
export const auditLogs = handler(async (req, res) => { ok(res, await service.getAuditLogs(String(req.params.vehicleId))); });
export const lock = handler(async (req, res) => { const input = req.body as LockVehicleInput; ok(res, await service.lockVehicle(String(req.params.vehicleId), input, context(req, input.reason, input.notes))); });
export const unlock = handler(async (req, res) => { const input = req.body as ReasonInput; ok(res, await service.unlockVehicle(String(req.params.vehicleId), input, context(req, input.reason, input.notes))); });
export const markNeedsInspection = handler(async (req, res) => { const input = req.body as ReasonInput; ok(res, await service.markNeedsInspection(String(req.params.vehicleId), input, context(req, input.reason, input.notes))); });
export const markMaintenance = handler(async (req, res) => { const input = req.body as MaintenanceInput; ok(res, await service.markMaintenance(String(req.params.vehicleId), input, context(req, input.reason, input.notes))); });
export const deactivate = handler(async (req, res) => { const input = req.body as ReasonInput; ok(res, await service.deactivateVehicle(String(req.params.vehicleId), input, context(req, input.reason, input.notes))); });
export const identifierCorrection = handler(async (req, res) => { res.status(201).json({ success: true, data: await service.createIdentifierCorrection(String(req.params.vehicleId), req.body as IdentifierCorrectionInput, req.user!.id) }); });
