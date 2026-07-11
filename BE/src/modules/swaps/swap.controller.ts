import type { RequestHandler } from "express";
import { swapService } from "./swap.service";

export const swapController = {
  initiate: (async (req, res) => {
    const data = await swapService.initiate(req.body.bookingId);
    res.status(200).json({ success: true, data });
  }) satisfies RequestHandler,

  process: (async (req, res) => {
    const data = await swapService.process(req.body);
    res.status(200).json({ success: true, data });
  }) satisfies RequestHandler,

  history: (async (req, res) => {
    const data = await swapService.history(req.user!.id);
    res.status(200).json({ success: true, data });
  }) satisfies RequestHandler,
};

