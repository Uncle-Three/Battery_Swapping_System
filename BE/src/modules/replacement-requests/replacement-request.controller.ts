import type { RequestHandler } from "express";
import { replacementRequestService } from "./replacement-request.service";

export const replacementRequestController = {
  listMine: (async (req, res) => res.json({ success: true, data: await replacementRequestService.listMine(req.user!.id) })) as RequestHandler,
};
