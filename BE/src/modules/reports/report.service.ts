import { reportRepository } from "./report.repository";

export const reportService = {
  analytics: (period?: string) => reportRepository.getAnalytics(period),
  inventory: () => reportRepository.getInventory(),
};

