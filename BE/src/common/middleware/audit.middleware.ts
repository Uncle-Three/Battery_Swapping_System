import type { Request, Response, NextFunction } from "express";
import { prisma } from "../../config/database";

export const serializeAuditPayload = (body: unknown): string => {
  const serialized = JSON.stringify(body ?? null) ?? "null";
  return `Payload: ${serialized.substring(0, 500)}`;
};

/**
 * Middleware để tự động lưu Audit Log cho các tác vụ thay đổi dữ liệu của Admin.
 * Nếu controller có gán `res.locals.audit`, nó sẽ dùng data đó (ví dụ: entityType, entityId, before, after).
 * Nếu không, nó sẽ dùng req.method và req.baseUrl làm thông tin mặc định.
 */
export const auditLogMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Chỉ quan tâm đến các request thay đổi dữ liệu (mutation)
  if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    // Lắng nghe sự kiện finish của response
    res.on("finish", () => {
      // Chỉ log khi thành công
      if (res.statusCode >= 200 && res.statusCode < 400) {
        const adminId = req.user?.id;
        if (!adminId) return;

        const auditData = res.locals.audit || {};
        
        const action = auditData.action || `${req.method} ${req.originalUrl.split('?')[0]}`;
        const details = auditData.details || serializeAuditPayload(req.body);

        // Thực hiện ghi log background, không block response
        prisma.auditLog
          .create({
            data: {
              adminId,
              stationId: auditData.stationId,
              action,
              details,
              entityType: auditData.entityType,
              entityId: auditData.entityId,
              before: auditData.before ? JSON.parse(JSON.stringify(auditData.before)) : null,
              after: auditData.after ? JSON.parse(JSON.stringify(auditData.after)) : null,
              ipAddress: req.ip || req.socket.remoteAddress,
              userAgent: req.headers["user-agent"]?.substring(0, 200),
            },
          })
          .catch((err) => {
            console.error("Failed to write audit log:", err);
          });
      }
    });
  }

  next();
};
