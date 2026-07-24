import type { RequestHandler } from "express";
import { stationService } from "./station.service";

export const stationController = {
  list: (async (_req, res) => {
    const data = await stationService.list();
    res.status(200).json({ success: true, data });
  }) satisfies RequestHandler,

  getById: (async (req, res) => {
    const data = await stationService.getById(String(req.params.id));
    res.status(200).json({ success: true, data });
  }) satisfies RequestHandler,

  getSlots: (async (req, res) => {
    const data = await stationService.getSlots(String(req.params.id));
    res.status(200).json({ success: true, data });
  }) satisfies RequestHandler,

  availability: (async (req, res) => {
    const data = await stationService.availability(
      String(req.params.id), String(req.query.vehicleId), new Date(String(req.query.startsAt)),
      new Date(String(req.query.endsAt)), req.user!.id,
    );
    res.status(200).json({ success: true, data });
  }) satisfies RequestHandler,

  bookingSchedule: (async (req, res) => {
    const vehicleId = typeof req.query.vehicleId === "string" ? req.query.vehicleId : undefined;
    const data = await stationService.bookingSchedule(
      String(req.params.id), vehicleId, String(req.query.date),
      Number(req.query.durationMinutes), req.user!.id,
    );
    res.status(200).json({ success: true, data });
  }) satisfies RequestHandler,

  // Admin Methods
  listAllForAdmin: (async (_req, res) => {
    const data = await stationService.list({ includeInactive: true });
    res.status(200).json({ success: true, data });
  }) satisfies RequestHandler,

  create: (async (req, res) => {
    const data = await stationService.create(req.body);
    res.locals.audit = {
      action: "CREATE_STATION",
      entityType: "Station",
      entityId: data.id,
      stationId: data.id,
      after: data,
    };
    res.status(201).json({ success: true, data });
  }) satisfies RequestHandler,

  update: (async (req, res) => {
    const oldData = await stationService.getById(String(req.params.id));
    const data = await stationService.update(String(req.params.id), req.body);
    res.locals.audit = {
      action: "UPDATE_STATION",
      entityType: "Station",
      entityId: data.id,
      stationId: data.id,
      before: oldData,
      after: data,
    };
    res.status(200).json({ success: true, data });
  }) satisfies RequestHandler,

  delete: (async (req, res) => {
    const oldData = await stationService.getById(String(req.params.id));
    await stationService.delete(String(req.params.id));
    res.locals.audit = {
      action: "DELETE_STATION",
      entityType: "Station",
      entityId: String(req.params.id),
      stationId: String(req.params.id),
      before: oldData,
    };
    res.status(200).json({ success: true });
  }) satisfies RequestHandler,
};
