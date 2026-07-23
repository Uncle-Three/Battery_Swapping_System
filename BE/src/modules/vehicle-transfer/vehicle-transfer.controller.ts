import type { RequestHandler } from "express";
import * as service from "./vehicle-transfer.service";

const ctx = (req: Parameters<RequestHandler>[0]) => ({
  ipAddress: req.ip ?? req.socket.remoteAddress,
  userAgent: req.headers["user-agent"]?.substring(0, 200),
});

export const vehicleTransferController = {
  // ─── Vehicle Lookup ─────────────────────────────────────────────────────────
  lookupVehicle: (async (req, res, next) => {
    try {
      const result = await service.lookupVehicle(
        { vin: req.query.vin as string, plateNumber: req.query.plateNumber as string },
        req.user?.id,
      );
      res.status(200).json({ success: true, data: result });
    } catch (err) { next(err); }
  }) as RequestHandler,

  lookupVehicleByQr: (async (req, res, next) => {
    try {
      const result = await service.lookupVehicle({ qrCode: req.params.qrCode as string }, req.user?.id);
      res.status(200).json({ success: true, data: result });
    } catch (err) { next(err); }
  }) as RequestHandler,

  // ─── Transfer Requests ──────────────────────────────────────────────────────
  createTransferRequest: (async (req, res, next) => {
    try {
      const result = await service.createTransferRequest(req.user!.id, req.body);
      res.status(201).json({ success: true, message: "Transfer request created as draft.", data: result });
    } catch (err) { next(err); }
  }) as RequestHandler,

  uploadDocuments: (async (req, res, next) => {
    try {
      const result = await service.uploadTransferDocuments(req.params.id as string, req.user!.id, req.body);
      res.status(200).json({ success: true, message: "Documents updated.", data: result });
    } catch (err) { next(err); }
  }) as RequestHandler,

  submitRequest: (async (req, res, next) => {
    try {
      const result = await service.submitTransferRequest(req.params.id as string, req.user!.id, ctx(req));
      res.status(200).json({ success: true, message: "Transfer request submitted successfully.", data: result });
    } catch (err) { next(err); }
  }) as RequestHandler,

  getMyRequests: (async (req, res, next) => {
    try {
      const { page = "0", size = "20" } = req.query as Record<string, string>;
      const result = await service.getMyTransferRequests(req.user!.id, parseInt(page), parseInt(size));
      res.status(200).json({ success: true, data: result });
    } catch (err) { next(err); }
  }) as RequestHandler,

  getRequestDetail: (async (req, res, next) => {
    try {
      const result = await service.getTransferRequestDetail(req.params.id as string, req.user!.id, req.user!.role);
      res.status(200).json({ success: true, data: result });
    } catch (err) { next(err); }
  }) as RequestHandler,

  cancelRequest: (async (req, res, next) => {
    try {
      const result = await service.cancelTransferRequest(req.params.id as string, req.user!.id, ctx(req));
      res.status(200).json({ success: true, message: "Transfer request cancelled.", data: result });
    } catch (err) { next(err); }
  }) as RequestHandler,

  // ─── Ownership History ──────────────────────────────────────────────────────
  getOwnershipHistory: (async (req, res, next) => {
    try {
      const { page = "0", size = "20" } = req.query as Record<string, string>;
      const result = await service.getOwnershipHistory(req.params.vehicleId as string, req.user!.id, req.user!.role, parseInt(page), parseInt(size));
      res.status(200).json({ success: true, data: result });
    } catch (err) { next(err); }
  }) as RequestHandler,

  // ─── Admin ──────────────────────────────────────────────────────────────────
  adminListRequests: (async (req, res, next) => {
    try {
      const result = await service.adminListTransferRequests(req.query as any);
      res.status(200).json({ success: true, data: result });
    } catch (err) { next(err); }
  }) as RequestHandler,

  adminGetRequestDetail: (async (req, res, next) => {
    try {
      const result = await service.getTransferRequestDetail(req.params.id as string, req.user!.id, req.user!.role);
      res.status(200).json({ success: true, data: result });
    } catch (err) { next(err); }
  }) as RequestHandler,

  adminRequestInfo: (async (req, res, next) => {
    try {
      const result = await service.adminRequestMoreInformation(req.params.id as string, req.user!.id, req.user!.role, req.body, ctx(req));
      res.status(200).json({ success: true, message: "Additional information requested.", data: result });
    } catch (err) { next(err); }
  }) as RequestHandler,

  adminApprove: (async (req, res, next) => {
    try {
      const result = await service.adminApproveTransfer(req.params.id as string, req.user!.id, req.user!.role, req.body, ctx(req));
      res.status(200).json({ success: true, message: result.message, data: {} });
    } catch (err) { next(err); }
  }) as RequestHandler,

  adminReject: (async (req, res, next) => {
    try {
      const result = await service.adminRejectTransfer(req.params.id as string, req.user!.id, req.user!.role, req.body, ctx(req));
      res.status(200).json({ success: true, message: result.message, data: {} });
    } catch (err) { next(err); }
  }) as RequestHandler,
};
