import apiClient from './apiClient';

export interface VehicleModelItem {
  id: string;
  manufacturer: string;
  name: string;
  modelYear?: number;
  connectorType?: string;
  nominalVoltage?: number;
  batteryClass?: string;
}

export const vehicleModelService = {
  getVehicleModels: async (): Promise<VehicleModelItem[]> => {
    const response = await apiClient.get<{ success: boolean; data: VehicleModelItem[] }>('/vehicle-models');
    return response.data.data;
  },
};
