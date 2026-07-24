import apiClient from './apiClient';
import type { BatteryCandidate } from '../features/dashboard/pages/staff/components/ReplacementBatteryCard';

export type ReplacementAllocationStatus =
  | 'SEARCHING'
  | 'NO_BATTERY_AVAILABLE'
  | 'BATTERY_SUGGESTED'
  | 'BATTERY_RESERVED'
  | 'QR_VERIFIED'
  | 'BATTERY_INSTALLED';

export interface ReplacementAllocationStatusResponse {
  state: ReplacementAllocationStatus;
  swapId: string;
  workflowStatus: string;
  stationId: string;
  stationName: string;
  requiredBatteryType: {
    id: string;
    code: string;
  };
  minimumSoc: number;
  recommendedBattery: BatteryCandidate | null;
  reservedBattery: BatteryCandidate | null;
  candidates: BatteryCandidate[];
  stats: {
    totalSameType: number;
    reservedCount: number;
    lowSocCount: number;
    inUseCount: number;
  };
}

export const replacementAllocationService = {
  getStatus: async (swapId: string): Promise<ReplacementAllocationStatusResponse> => {
    const response = await apiClient.get<{ success: boolean; data: ReplacementAllocationStatusResponse }>(
      `/swap-transactions/${swapId}/replacement-battery/status`
    );
    return response.data.data;
  },

  getCandidates: async (swapId: string): Promise<ReplacementAllocationStatusResponse> => {
    const response = await apiClient.get<{ success: boolean; data: ReplacementAllocationStatusResponse }>(
      `/swap-transactions/${swapId}/replacement-battery/candidates`
    );
    return response.data.data;
  },

  reserve: async (swapId: string, batteryId: string) => {
    const response = await apiClient.post(`/swap-transactions/${swapId}/replacement-battery/reserve`, {
      batteryId,
    });
    return response.data;
  },

  cancelReservation: async (swapId: string) => {
    const response = await apiClient.delete(`/swap-transactions/${swapId}/replacement-battery/reservation`);
    return response.data;
  },

  verifyQr: async (swapId: string, scannedValue: string) => {
    const response = await apiClient.post(`/swap-transactions/${swapId}/replacement-battery/verify`, {
      scannedValue,
    });
    return response.data;
  },

  install: async (swapId: string) => {
    const response = await apiClient.post(`/swap-transactions/${swapId}/replacement-battery/install`);
    return response.data;
  },

  reportShortage: async (swapId: string, reason?: string) => {
    const response = await apiClient.post(`/swap-transactions/${swapId}/replacement-battery/report-shortage`, {
      reason,
    });
    return response.data;
  },
};
