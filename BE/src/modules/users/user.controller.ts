import type { RequestHandler } from "express";
import { userService } from "./user.service";

export const userController = {
  getMe: (async (req, res) => {
    const data = await userService.getProfile(req.user!.id);
    res.status(200).json({ success: true, data });
  }) satisfies RequestHandler,

  updateMe: (async (req, res) => {
    const data = await userService.updateMe(req.user!.id, req.body);
    res.status(200).json({ success: true, data });
  }) satisfies RequestHandler,

  list: (async (_req, res) => {
    const data = await userService.list();
    res.status(200).json({ success: true, data });
  }) satisfies RequestHandler,
};
