import apiClient, { unwrapData } from "./apiClient";
import type {
  VehicleTransferRequest,
  PaginatedResponse,
  VehicleOwnershipHistory,
} from "../types/vehicle-transfer";

type CreateTransferInput = {
  vehicleId: string;
  requestType: VehicleTransferRequest["requestType"];
  reason?: string;
};

type UploadDocumentsInput = {
  registrationDocumentUrl?: string;
  identityDocumentUrl?: string;
  purchaseContractUrl?: string;
  additionalDocumentUrls?: string[];
};

export const vehicleTransferService = {
  createTransferRequest: async (data: CreateTransferInput): Promise<VehicleTransferRequest> => {
    const res = await apiClient.post("/vehicle-transfer-requests", data);
    return unwrapData<VehicleTransferRequest>(res);
  },

  uploadDocuments: async (id: string, data: UploadDocumentsInput): Promise<VehicleTransferRequest> => {
    const res = await apiClient.post(`/vehicle-transfer-requests/${id}/documents`, data);
    return unwrapData<VehicleTransferRequest>(res);
  },

  submitRequest: async (id: string): Promise<VehicleTransferRequest> => {
    const res = await apiClient.post(`/vehicle-transfer-requests/${id}/submit`);
    return unwrapData<VehicleTransferRequest>(res);
  },

  getMyRequests: async (params?: { page?: number; size?: number }): Promise<PaginatedResponse<VehicleTransferRequest>> => {
    const res = await apiClient.get("/vehicle-transfer-requests/my-requests", { params });
    return unwrapData<PaginatedResponse<VehicleTransferRequest>>(res);
  },

  getRequestById: async (id: string): Promise<VehicleTransferRequest> => {
    const res = await apiClient.get(`/vehicle-transfer-requests/${id}`);
    return unwrapData<VehicleTransferRequest>(res);
  },

  cancelRequest: async (id: string): Promise<VehicleTransferRequest> => {
    const res = await apiClient.patch(`/vehicle-transfer-requests/${id}/cancel`);
    return unwrapData<VehicleTransferRequest>(res);
  },

  getOwnershipHistory: async (vehicleId: string, params?: { page?: number; size?: number }): Promise<PaginatedResponse<VehicleOwnershipHistory>> => {
    const res = await apiClient.get(`/vehicles/${vehicleId}/ownership-history`, { params });
    return unwrapData<PaginatedResponse<VehicleOwnershipHistory>>(res);
  },
};
