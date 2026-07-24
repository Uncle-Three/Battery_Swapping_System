import apiClient from "./apiClient";
import type { 
  Vehicle, 
  PagedResponse, 
  VehicleBatteryHistory, 
  VehicleMileageHistory,
  BatteryQrData,
  SwapEligibility 
} from "../types/vehicle";

export const vehicleService = {
  getMyVehicles: async (params?: Record<string, any>) => {
    const response = await apiClient.get<PagedResponse<Vehicle>>("/member/vehicles", { params });
    return response.data;
  },

  getVehicleById: async (vehicleId: string) => {
    const response = await apiClient.get<Vehicle>(`/member/vehicles/${vehicleId}`);
    return response.data;
  },

  createVehicle: async (payload: any) => {
    const dataToSend = { ...payload };
    if (dataToSend.vin) {
      dataToSend.vinNumber = dataToSend.vin;
    }
    delete dataToSend.vin;
    if (dataToSend.purchaseDate === "") {
      delete dataToSend.purchaseDate;
    }
    if (!dataToSend.batteryOwnershipType) {
      dataToSend.batteryOwnershipType = "UNKNOWN";
    }
    const response = await apiClient.post<Vehicle>("/member/vehicles", dataToSend);
    return response.data;
  },

  updateVehicle: async (vehicleId: string, payload: any) => {
    const dataToSend = { ...payload };
    if (dataToSend.vin) {
      dataToSend.vinNumber = dataToSend.vin;
    }
    delete dataToSend.vin;
    if (dataToSend.purchaseDate === "") {
      delete dataToSend.purchaseDate;
    }
    const response = await apiClient.patch<Vehicle>(`/member/vehicles/${vehicleId}`, dataToSend);
    return response.data;
  },

  updateMileage: async (vehicleId: string, payload: { currentMileageKm: number, recordedAt?: string, note?: string }) => {
    const dataToSend = { ...payload };
    if (dataToSend.recordedAt === "") {
      delete dataToSend.recordedAt;
    }
    const response = await apiClient.patch(`/member/vehicles/${vehicleId}/mileage`, dataToSend);
    return response.data;
  },

  deleteVehicle: async (vehicleId: string) => {
    const response = await apiClient.delete(`/member/vehicles/${vehicleId}`);
    return response.data;
  },

  getBatteryHistory: async (vehicleId: string, params?: Record<string, any>) => {
    const response = await apiClient.get<PagedResponse<VehicleBatteryHistory>>(`/member/vehicles/${vehicleId}/battery-history`, { params });
    return response.data;
  },

  getMileageHistory: async (vehicleId: string, params?: Record<string, any>) => {
    const response = await apiClient.get<PagedResponse<VehicleMileageHistory>>(`/member/vehicles/${vehicleId}/mileage-history`, { params });
    return response.data;
  },

  getBatteryQr: async (vehicleId: string) => {
    const response = await apiClient.get<BatteryQrData>(`/member/vehicles/${vehicleId}/battery-qr`);
    return response.data;
  },

  checkSwapEligibility: async (vehicleId: string) => {
    const response = await apiClient.get<SwapEligibility>(`/member/vehicles/${vehicleId}/swap-eligibility`);
    return response.data;
  }
};
