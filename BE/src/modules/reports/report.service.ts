import { reportRepository } from "./report.repository";

export const reportService = {
  analytics: (userId: string, role: string, period?: string) => reportRepository.getAnalytics(userId, role, period),
  inventory: (userId: string, role: string) => reportRepository.getInventory(userId, role),
};
