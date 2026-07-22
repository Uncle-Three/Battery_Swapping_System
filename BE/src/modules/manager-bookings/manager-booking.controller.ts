import type { RequestHandler } from "express";
import { managerBookingService } from "./manager-booking.service";

export const managerBookingController = {
  pending: (async (req, res) => res.json({ success: true, data: await managerBookingService.getPending(req.user!.id, req.user!.role) })) satisfies RequestHandler,
  history: (async (req, res) => res.json({ success: true, data: await managerBookingService.getHistory(req.user!.id, req.user!.role) })) satisfies RequestHandler,
  getById: (async (req, res) => res.json({ success: true, data: await managerBookingService.getById(String(req.params.id), req.user!.id, req.user!.role) })) satisfies RequestHandler,
  approve: (async (req, res) => res.json({ success: true, data: await managerBookingService.approve(String(req.params.id), req.user!.id, req.user!.role) })) satisfies RequestHandler,
  reject: (async (req, res) => res.json({ success: true, data: await managerBookingService.reject(String(req.params.id), req.user!.id, req.user!.role, req.body.reason) })) satisfies RequestHandler,
  reschedule: (async (req, res) => res.json({ success: true, data: await managerBookingService.proposeReschedule(String(req.params.id), req.user!.id, req.user!.role, req.body) })) satisfies RequestHandler,
};
