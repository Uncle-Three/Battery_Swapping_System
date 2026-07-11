import { auditLogRepository } from "./audit-log.repository";

export const auditLogService = {
  list: async () => {
    const logs = await auditLogRepository.findMany();
    return logs.map((log) => ({
      id: log.id,
      adminId: log.adminId,
      adminName: log.admin?.fullName ?? null,
      adminEmail: log.admin?.email ?? null,
      action: log.action,
      details: log.details,
      time: log.createdAt.toISOString(),
    }));
  },
  create: (input: { adminId?: string; action: string; details?: string }) => auditLogRepository.create(input),
};
