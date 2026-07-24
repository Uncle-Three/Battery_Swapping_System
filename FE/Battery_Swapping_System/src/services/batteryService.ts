import apiClient from './apiClient';
import type { AddBatteryInput, BatteryItem, BatteryType, StationOption } from '../types/battery';

export const batteryService = {
  createBattery: async (payload: AddBatteryInput): Promise<BatteryItem> => {
    const response = await apiClient.post<{ success: boolean; message: string; data: BatteryItem }>(
      '/batteries',
      payload
    );
    return response.data.data;
  },

  getBatteryTypes: async (): Promise<BatteryType[]> => {
    const response = await apiClient.get<{ success: boolean; data: BatteryType[] }>('/battery-types');
    return response.data.data;
  },

  getAuthorizedStations: async (): Promise<StationOption[]> => {
    const response = await apiClient.get<{ success: boolean; data: StationOption[] }>('/stations');
    return response.data.data;
  },
};
