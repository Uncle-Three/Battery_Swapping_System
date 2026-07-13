import { auditLogRepository } from "./audit-log.repository";

export const auditLogService = {
  list: async (params?: { limit?: number; offset?: number; action?: string }) => {
    const [logs, total] = await Promise.all([
      auditLogRepository.findMany(params),
      auditLogRepository.count({ action: params?.action }),
    ]);
    return {
      items: logs.map((log) => ({
        id: log.id,
        adminId: log.adminId,
        adminName: log.admin?.fullName ?? null,
        adminEmail: log.admin?.email ?? null,
        action: log.action,
        details: log.details,
        time: log.createdAt.toISOString(),
      })),
      total,
      limit: params?.limit ?? 50,
      offset: params?.offset ?? 0,
    };
  },
  create: (input: { adminId?: string; action: string; details?: string }) => auditLogRepository.create(input),
};
