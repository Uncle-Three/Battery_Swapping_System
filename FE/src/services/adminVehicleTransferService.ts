import apiClient, { unwrapData } from "./apiClient";
import type {
  VehicleTransferRequest,
  PaginatedResponse,
  AccountRecoveryRequest,
} from "../types/vehicle-transfer";

type AdminListParams = {
  status?: VehicleTransferRequest["status"];
  requestType?: VehicleTransferRequest["requestType"];
  vin?: string;
  plateNumber?: string;
  page?: number;
  size?: number;
  sortField?: string;
  sortDirection?: "asc" | "desc";
};

type AdminApproveInput = { adminNotes?: string };
type AdminRejectInput = { rejectionReason: string; adminNotes?: string };
type AdminRequestInfoInput = { additionalInfoRequest: string; adminNotes?: string };

export const adminVehicleTransferService = {
  listRequests: async (params?: AdminListParams): Promise<PaginatedResponse<VehicleTransferRequest>> => {
    const res = await apiClient.get("/admin/vehicle-transfer-requests", { params });
    return unwrapData<PaginatedResponse<VehicleTransferRequest>>(res);
  },

  getRequestDetail: async (id: string): Promise<VehicleTransferRequest> => {
    const res = await apiClient.get(`/admin/vehicle-transfer-requests/${id}`);
    return unwrapData<VehicleTransferRequest>(res);
  },

  requestMoreInfo: async (id: string, data: AdminRequestInfoInput): Promise<{ message: string }> => {
    const res = await apiClient.patch<{ message: string }>(`/admin/vehicle-transfer-requests/${id}/request-information`, data);
    return res.data;
  },

  approveRequest: async (id: string, data: AdminApproveInput): Promise<{ message: string }> => {
    const res = await apiClient.patch<{ message: string }>(`/admin/vehicle-transfer-requests/${id}/approve`, data);
    return res.data;
  },

  rejectRequest: async (id: string, data: AdminRejectInput): Promise<{ message: string }> => {
    const res = await apiClient.patch<{ message: string }>(`/admin/vehicle-transfer-requests/${id}/reject`, data);
    return res.data;
  },

  // Account Recovery admin endpoints
  listAccountRecoveryRequests: async (params?: { status?: string; page?: number; size?: number }): Promise<PaginatedResponse<AccountRecoveryRequest>> => {
    const res = await apiClient.get("/admin/account-recovery-requests", { params });
    return unwrapData<PaginatedResponse<AccountRecoveryRequest>>(res);
  },

  approveRecovery: async (id: string, data: { adminNotes?: string; resolvedAction?: string }): Promise<{ message: string }> => {
    const res = await apiClient.patch<{ message: string }>(`/admin/account-recovery-requests/${id}/approve`, data);
    return res.data;
  },

  rejectRecovery: async (id: string, data: { adminNotes?: string; rejectionReason: string }): Promise<{ message: string }> => {
    const res = await apiClient.patch<{ message: string }>(`/admin/account-recovery-requests/${id}/reject`, data);
    return res.data;
  },
};
