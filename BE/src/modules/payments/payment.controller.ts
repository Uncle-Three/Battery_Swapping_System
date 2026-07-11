import type { RequestHandler } from "express";
import { paymentService } from "./payment.service";

export const paymentController = {
  getWallet: (async (req, res) => {
    const data = await paymentService.getWallet(req.user!.id);
    res.status(200).json({ success: true, data });
  }) satisfies RequestHandler,

  createTopup: (async (req, res) => {
    const data = await paymentService.createTopup(req.user!.id, req.body);
    res.status(201).json({ success: true, data });
  }) satisfies RequestHandler,

  purchaseSubscription: (async (req, res) => {
    const data = await paymentService.purchaseSubscription(req.user!.id, req.body);
    res.status(201).json({ success: true, data });
  }) satisfies RequestHandler,
};

