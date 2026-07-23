import type { RequestHandler } from "express";
import { accountRecoveryService as service } from "./account-recovery.service";

const context = (req: Parameters<RequestHandler>[0]) => ({
  ipAddress: req.ip ?? req.socket.remoteAddress,
  userAgent: req.headers["user-agent"]?.substring(0, 200),
});

export const accountRecoveryController = {
  forgotPassword: (async (req, res, next) => {
    try {
      const result = await service.requestPasswordReset(req.body);
      res.status(200).json({ success: true, message: result.message, data: {} });
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,

  verifyResetOtp: (async (req, res, next) => {
    try {
      const result = await service.verifyResetOtp(req.body);
      res.status(200).json({ success: true, message: result.message, data: { valid: result.valid } });
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,

  resetPassword: (async (req, res, next) => {
    try {
      const result = await service.resetPassword(req.body, context(req));
      res.status(200).json({ success: true, message: result.message, data: {} });
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,

  requestPhoneChange: (async (req, res, next) => {
    try {
      const result = await service.requestPhoneChange(req.user!.id, req.body, context(req));
      res.status(200).json({ success: true, message: result.message, data: {} });
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,

  verifyPhoneChange: (async (req, res, next) => {
    try {
      const result = await service.verifyPhoneChange(req.user!.id, req.body, context(req));
      res.status(200).json({ success: true, message: result.message, data: {} });
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,

  requestManualRecovery: (async (req, res, next) => {
    try {
      const result = await service.requestManualRecovery(req.body, req.user?.id);
      res.status(201).json({ success: true, message: result.message, data: { id: result.id } });
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,

  // Admin handlers
  listRecoveryRequests: (async (req, res, next) => {
    try {
      const result = await service.adminGetRecoveryRequests(req.query as any);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,

  approveRecovery: (async (req, res, next) => {
    try {
      const result = await service.adminApproveRecovery(req.params.id as string, req.user!.id, req.user!.role, req.body, context(req));
      res.status(200).json({ success: true, message: result.message, data: {} });
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,

  rejectRecovery: (async (req, res, next) => {
    try {
      const result = await service.adminRejectRecovery(req.params.id as string, req.user!.id, req.user!.role, req.body, context(req));
      res.status(200).json({ success: true, message: result.message, data: {} });
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,
};
