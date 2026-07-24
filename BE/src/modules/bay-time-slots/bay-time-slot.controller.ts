import type { RequestHandler } from "express";
import { bayTimeSlotService } from "./bay-time-slot.service";

export const bayTimeSlotController = {
  createBulk: (async (req, res) => {
    const data = await bayTimeSlotService.createBulk(String(req.params.stationId), req.body, req.user!.id);
    res.status(201).json({ success: true, message: "Tạo khung giờ thành công.", ...data });
  }) satisfies RequestHandler,
  list: (async (req, res) => {
    const data = await bayTimeSlotService.list(String(req.params.stationId), req.query as never);
    res.json({ success: true, data });
  }) satisfies RequestHandler,
  createSingle: (async (req, res) => {
    const data = await bayTimeSlotService.createSingle(String(req.params.bayId), req.body, req.user!.id);
    res.status(201).json({ success: true, data });
  }) satisfies RequestHandler,
  updateStatus: (async (req, res) => {
    const data = await bayTimeSlotService.updateStatus(String(req.params.slotId), req.body, req.user!.id);
    res.json({ success: true, data });
  }) satisfies RequestHandler,
  updateBulkStatus: (async (req, res) => {
    const { slotIds, ...input } = req.body;
    const data = await bayTimeSlotService.updateBulkStatus(slotIds, input, req.user!.id);
    res.json({ success: true, ...data });
  }) satisfies RequestHandler,
  remove: (async (req, res) => {
    const data = await bayTimeSlotService.remove(String(req.params.slotId), req.user!.id);
    res.json({ success: true, data });
  }) satisfies RequestHandler,
  available: (async (req, res) => {
    const data = await bayTimeSlotService.available(String(req.params.id), String(req.query.date));
    res.json({ success: true, data });
  }) satisfies RequestHandler,
  groupedAvailability: (async (req, res) => {
    const data = await bayTimeSlotService.groupedAvailability(String(req.params.id), String(req.query.date));
    res.json({ success: true, data });
  }) satisfies RequestHandler,
  availableDates: (async (req, res) => {
    const data = await bayTimeSlotService.availableDates(String(req.params.id));
    res.json({ success: true, data });
  }) satisfies RequestHandler,
};
