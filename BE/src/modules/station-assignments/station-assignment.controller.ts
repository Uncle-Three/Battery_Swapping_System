import type { RequestHandler } from "express";
import { stationAssignmentService } from "./station-assignment.service";

export const stationAssignmentController = {
  list: (async (_req, res) => res.json({ success: true, data: await stationAssignmentService.list() })) as RequestHandler,
  create: (async (req, res) => res.status(201).json({ success: true, data: await stationAssignmentService.create(req.body) })) as RequestHandler,
  deactivate: (async (req, res) => res.json({ success: true, data: await stationAssignmentService.deactivate(String(req.params.id)) })) as RequestHandler,
};
