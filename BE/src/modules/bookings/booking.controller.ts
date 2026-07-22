import type { RequestHandler } from "express";
import { bookingService } from "./booking.service";

export const bookingController = {
  getAll: (async (req, res) => {
    const data = await bookingService.getAll(req.user!.id);
    res.status(200).json({ success: true, data });
  }) satisfies RequestHandler,

  getActive: (async (req, res) => {
    const data = await bookingService.getActive(req.user!.id);
    res.status(200).json({ success: true, data });
  }) satisfies RequestHandler,

  create: (async (req, res) => {
    const data = await bookingService.create(req.user!.id, req.body);
    res.status(201).json({ success: true, data });
  }) satisfies RequestHandler,

  quote: (async (req, res) => {
    const data = await bookingService.quote(req.user!.id, req.body);
    res.status(200).json({ success: true, data });
  }) satisfies RequestHandler,

  getById: (async (req, res) => {
    const data = await bookingService.getById(String(req.params.id), req.user!.id);
    res.status(200).json({ success: true, data });
  }) satisfies RequestHandler,

  cancel: (async (req, res) => {
    const data = await bookingService.cancel(String(req.params.id), req.user!.id);
    res.status(200).json({ success: true, data });
  }) satisfies RequestHandler,
  confirmReschedule: (async (req, res) => {
    const data = await bookingService.confirmReschedule(String(req.params.id), req.user!.id);
    res.status(200).json({ success: true, data });
  }) satisfies RequestHandler,
};
