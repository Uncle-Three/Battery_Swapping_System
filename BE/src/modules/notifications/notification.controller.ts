import type { RequestHandler } from "express";
import { notificationService } from "./notification.service";

export const notificationController = {
  listMine: (async (req, res) => res.json({ success: true, data: await notificationService.listMine(req.user!.id) })) as RequestHandler,
  markRead: (async (req, res) => res.json({ success: true, data: await notificationService.markRead(req.user!.id, String(req.params.id)) })) as RequestHandler,
  markAllRead: (async (req, res) => res.json({ success: true, data: await notificationService.markAllRead(req.user!.id) })) as RequestHandler,
};
