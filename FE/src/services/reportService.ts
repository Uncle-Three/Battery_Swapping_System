import { API_ENDPOINTS } from '../constants/endpoints';
import apiClient, { unwrapData } from './apiClient';

export type AnalyticsReport = {
  period: string; totalSwaps: number; activeUsers: number; revenue: number; averageReplacementMinutes: number;
  approvalRate: number; failureRate: number; mandatoryOpen: number;
  batterySafety: Record<string, number>; bookingStatuses: Record<string, number>; inspectionOutcomes: Record<string, number>;
  stationStats: Array<{ id: string; name: string; status: string; swaps: number; revenue: number; slotCount: number }>;
};
export type InventoryBattery = { id: string; serialNumber: string; soc: number; soh: number; temperature: number; voltage: number; safetyState: string; operationalStatus: string; batteryType?: { code: string } | null; station?: { name: string } | null };
export type InventoryReport = { totalBatteries: number; byOperationalStatus: Record<string, number>; bySafetyState: Record<string, number>; batteries: InventoryBattery[] };

export const reportService = {
  getAnalytics: async (period: 'week' | 'month' | 'year') => unwrapData<AnalyticsReport>(await apiClient.get(API_ENDPOINTS.REPORTS.ANALYTICS, { params: { period } })),
  getInventory: async () => unwrapData<InventoryReport>(await apiClient.get(API_ENDPOINTS.REPORTS.INVENTORY)),
};
