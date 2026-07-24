import apiClient, { unwrapData } from "./apiClient";
import type { VehicleLookupResponse } from "../types/vehicle-transfer";

export const vehicleLookupService = {
  lookupByVin: async (vin: string, signal?: AbortSignal): Promise<VehicleLookupResponse> => {
    const res = await apiClient.get("/vehicles/lookup", { params: { vin }, signal });
    return unwrapData<VehicleLookupResponse>(res);
  },

  lookupByPlate: async (plateNumber: string, signal?: AbortSignal): Promise<VehicleLookupResponse> => {
    const res = await apiClient.get("/vehicles/lookup", { params: { plateNumber }, signal });
    return unwrapData<VehicleLookupResponse>(res);
  },

  lookupByQr: async (qrCode: string, signal?: AbortSignal): Promise<VehicleLookupResponse> => {
    const res = await apiClient.get(`/vehicles/qr/${encodeURIComponent(qrCode)}`, { signal });
    return unwrapData<VehicleLookupResponse>(res);
  },
};
