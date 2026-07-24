import type { NextFunction, Request, Response } from "express";
import * as service from "./admin-swap-transaction.service";
import type { AdminSwapListQuery } from "./admin-swap-transaction.validation";

export const list = async (req: Request, res: Response, next: NextFunction) => { try { res.json({ success: true, data: await service.listAdminSwaps(req.query as unknown as AdminSwapListQuery) }); } catch (error) { next(error); } };
export const detail = async (req: Request, res: Response, next: NextFunction) => { try { res.json({ success: true, data: await service.getAdminSwapDetail(String(req.params.transactionId)) }); } catch (error) { next(error); } };
