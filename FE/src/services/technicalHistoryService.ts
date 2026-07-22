import apiClient, { unwrapData } from "./apiClient";
import type { VehicleTechnicalHistory } from "../types/vehicle-transfer";

export const technicalHistoryService = {
  getVehicleTechnicalHistory: async (vehicleId: string, params?: { page?: number; size?: number }): Promise<VehicleTechnicalHistory> => {
    const res = await apiClient.get(`/vehicles/${vehicleId}/technical-history`, { params });
    return unwrapData<VehicleTechnicalHistory>(res);
  },
};
