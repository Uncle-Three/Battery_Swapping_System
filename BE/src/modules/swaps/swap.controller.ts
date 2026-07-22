import type { RequestHandler } from "express";
import { swapService } from "./swap.service";

export const swapController = {
  history: (async (req, res) => {
    const data = await swapService.history(req.user!.id);
    res.status(200).json({ success: true, data });
  }) satisfies RequestHandler,
};
