import type { RequestHandler } from "express";
import { adminService } from "./admin.service";

export const adminController = {
  overview: (async (_req, res) => {
    const data = await adminService.overview();
    res.status(200).json({ success: true, data });
  }) satisfies RequestHandler,

  auditLogs: (async (req, res) => {
    const data = await adminService.auditLogs(req.query);
    res.status(200).json({ success: true, data });
  }) satisfies RequestHandler,
  settings: (async (_req, res) => res.status(200).json({ success: true, data: await adminService.settings() })) satisfies RequestHandler,
  updateSetting: (async (req, res) => res.status(200).json({ success: true, data: await adminService.updateSetting(req.user!.id, String(req.params.key), req.body.value) })) satisfies RequestHandler,

  listUsers: (async (_req, res) => {
    const data = await adminService.listUsers();
    res.status(200).json({ success: true, data });
  }) satisfies RequestHandler,

  listRoles: (async (_req, res) => {
    const data = await adminService.listRoles();
    res.status(200).json({ success: true, data });
  }) satisfies RequestHandler,

  listPermissions: (async (_req, res) => {
    const data = await adminService.listPermissions();
    res.status(200).json({ success: true, data });
  }) satisfies RequestHandler,

  updateUserRole: (async (req, res) => {
    const data = await adminService.updateUserRole(req.user!.id, String(req.params.id), req.body.role);
    res.status(200).json({ success: true, data });
  }) satisfies RequestHandler,

  updateUserStatus: (async (req, res) => {
    const data = await adminService.updateUserStatus(req.user!.id, String(req.params.id), req.body.status);
    res.status(200).json({ success: true, data });
  }) satisfies RequestHandler,
};
