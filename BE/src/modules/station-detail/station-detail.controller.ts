import type { RequestHandler } from "express";
import { stationDetailService as service } from "./station-detail.service";

export const stationDetailController = {
  detail: (async (req, res) => res.json({ success: true, data: await service.detail(String(req.params.stationId)) })) as RequestHandler,
  overview: (async (req, res) => res.json({ success: true, data: await service.overview(String(req.params.stationId)) })) as RequestHandler,
  bays: (async (req, res) => res.json({ success: true, data: await service.listBays(String(req.params.stationId)) })) as RequestHandler,
  createBay: (async (req, res) => res.status(201).json({ success: true, data: await service.createBay(String(req.params.stationId), req.body, req.user!.id) })) as RequestHandler,
  updateBay: (async (req, res) => res.json({ success: true, data: await service.updateBay(String(req.params.stationId), String(req.params.bayId), req.body, req.user!.id) })) as RequestHandler,
  deleteBay: (async (req, res) => res.json({ success: true, data: await service.deleteBay(String(req.params.stationId), String(req.params.bayId), req.user!.id) })) as RequestHandler,
  slots: (async (req, res) => res.json({ success: true, data: await service.listSlots(String(req.params.stationId), req.query) })) as RequestHandler,
  createSlot: (async (req, res) => res.status(201).json({ success: true, data: await service.createSlot(String(req.params.stationId), req.body, req.user!.id) })) as RequestHandler,
  updateSlot: (async (req, res) => res.json({ success: true, data: await service.updateSlot(String(req.params.stationId), String(req.params.slotId), req.body, req.user!.id) })) as RequestHandler,
  deleteSlot: (async (req, res) => res.json({ success: true, data: await service.deleteSlot(String(req.params.stationId), String(req.params.slotId), req.user!.id) })) as RequestHandler,
  inventory: (async (req, res) => res.json({ success: true, data: await service.inventory(String(req.params.stationId), req.query) })) as RequestHandler,
  updateInventory: (async (req, res) => res.json({ success: true, data: await service.updateInventory(String(req.params.stationId), String(req.params.batteryId), req.body, req.user!.id) })) as RequestHandler,
  inventoryHistory: (async (req, res) => res.json({ success: true, data: await service.inventoryHistory(String(req.params.stationId), String(req.params.batteryId)) })) as RequestHandler,
  bookings: (async (req, res) => res.json({ success: true, data: await service.bookings(String(req.params.stationId), req.query) })) as RequestHandler,
  cancelBooking: (async (req, res) => res.json({
    success: true,
    data: await service.cancelBooking(
      String(req.params.stationId),
      String(req.params.bookingId),
      req.body,
      req.user!.id,
    ),
  })) as RequestHandler,
  assignments: (async (req, res) => res.json({ success: true, data: await service.assignments(String(req.params.stationId)) })) as RequestHandler,
  assignmentCandidates: (async (req, res) => res.json({ success: true, data: await service.assignmentCandidates(String(req.params.stationId)) })) as RequestHandler,
  createAssignment: (async (req, res) => res.status(201).json({ success: true, data: await service.createAssignment(String(req.params.stationId), req.body, req.user!.id) })) as RequestHandler,
  updateAssignment: (async (req, res) => res.json({ success: true, data: await service.updateAssignment(String(req.params.stationId), String(req.params.assignmentId), req.body, req.user!.id) })) as RequestHandler,
  deleteAssignment: (async (req, res) => res.json({ success: true, data: await service.deleteAssignment(String(req.params.stationId), String(req.params.assignmentId), req.user!.id) })) as RequestHandler,
  maintenance: (async (req, res) => res.json({ success: true, data: await service.maintenance(String(req.params.stationId), req.query) })) as RequestHandler,
  createMaintenance: (async (req, res) => res.status(201).json({ success: true, data: await service.createMaintenance(String(req.params.stationId), req.body, req.user!.id) })) as RequestHandler,
  updateMaintenance: (async (req, res) => res.json({ success: true, data: await service.updateMaintenance(String(req.params.stationId), String(req.params.maintenanceId), req.body, req.user!.id) })) as RequestHandler,
  reports: (async (req, res) => res.json({ success: true, data: await service.reports(String(req.params.stationId), req.query) })) as RequestHandler,
  auditLogs: (async (req, res) => res.json({ success: true, data: await service.auditLogs(String(req.params.stationId), req.query) })) as RequestHandler,
};
