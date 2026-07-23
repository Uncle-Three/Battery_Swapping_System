import type { RequestHandler } from "express";
import { staffSwapService } from "./staff-swap.service";

export const staffSwapController = {
  context: (async (req, res) => res.json({ success: true, data: await staffSwapService.getContext(req.user!.id, req.user!.role) })) satisfies RequestHandler,
  history: (async (req, res) => res.json({ success: true, data: await staffSwapService.history(req.user!.id, req.user!.role) })) satisfies RequestHandler,
  lookup: (async (req, res) => res.json({ success: true, data: await staffSwapService.lookup(req.body.bookingId, req.body.stationId, req.user!.id, req.user!.role) })) satisfies RequestHandler,
  checkIn: (async (req, res) => res.status(201).json({ success: true, data: await staffSwapService.checkIn(String(req.params.id), req.body.stationId, req.body.serviceBayId, req.user!.id, req.user!.role) })) satisfies RequestHandler,
  get: (async (req, res) => res.json({ success: true, data: await staffSwapService.getScopedSwap(String(req.params.id), req.user!.id, req.user!.role) })) satisfies RequestHandler,
  verify: (async (req, res) => res.json({ success: true, data: await staffSwapService.verify(String(req.params.id), req.user!.id, req.user!.role) })) satisfies RequestHandler,
  scanBattery: (async (req, res) => res.json({ success: true, data: await staffSwapService.scanBattery(String(req.params.id), req.user!.id, req.user!.role, req.body.serialNumber) })) satisfies RequestHandler,
  remove: (async (req, res) => res.json({ success: true, data: await staffSwapService.removeOldBattery(String(req.params.id), req.user!.id, req.user!.role, req.body) })) satisfies RequestHandler,
  inspect: (async (req, res) => res.json({ success: true, data: await staffSwapService.inspect(String(req.params.id), req.user!.id, req.user!.role, req.body) })) satisfies RequestHandler,
  assign: (async (req, res) => res.json({ success: true, data: await staffSwapService.assignReplacement(String(req.params.id), req.user!.id, req.user!.role, req.body.serialNumber) })) satisfies RequestHandler,
  install: (async (req, res) => res.json({ success: true, data: await staffSwapService.install(String(req.params.id), req.user!.id, req.user!.role, req.body.serialNumber) })) satisfies RequestHandler,
  collectPayment: (async (req, res) => res.json({ success: true, data: await staffSwapService.collectPayment(String(req.params.id), req.user!.id, req.user!.role) })) satisfies RequestHandler,
  rollback: (async (req, res) => res.json({ success: true, data: await staffSwapService.rollback(String(req.params.id), req.user!.id, req.user!.role, req.body.reason) })) satisfies RequestHandler,
};
