import apiClient, { unwrapData } from "./apiClient";
import type {
  AdminAuditLog,
  AdminVehicleDetail,
  AdminVehicleFilters,
  AdminVehicleListResponse,
  LockVehiclePayload,
  MaintenancePayload,
  ReasonPayload,
  VehicleSwapHistoryItem,
} from "../types/adminVehicle";

const base = "/admin/vehicles";
export const getAdminVehicles = async (params: AdminVehicleFilters) =>
  unwrapData<AdminVehicleListResponse>(await apiClient.get(base, { params }));
export const getAdminVehicleDetail = async (id: string) =>
  unwrapData<AdminVehicleDetail>(await apiClient.get(`${base}/${id}`));
export const getVehicleBatteryHealth = async (id: string) =>
  unwrapData<unknown>(await apiClient.get(`${base}/${id}/battery-health`));
export const getVehicleBatteryHealthLogs = async (id: string) =>
  unwrapData<unknown[]>(
    await apiClient.get(`${base}/${id}/battery-health-logs`),
  );
export const getVehicleSwapHistory = async (id: string) =>
  unwrapData<VehicleSwapHistoryItem[]>(
    await apiClient.get(`${base}/${id}/swap-history`),
  );
export const getVehicleMaintenanceHistory = async (id: string) =>
  unwrapData<unknown[]>(
    await apiClient.get(`${base}/${id}/maintenance-history`),
  );
export const getVehicleIncidents = async (id: string) =>
  unwrapData<unknown[]>(await apiClient.get(`${base}/${id}/incidents`));
export const getVehicleOwnershipHistory = async (id: string) =>
  unwrapData<unknown[]>(await apiClient.get(`${base}/${id}/ownership-history`));
export const getVehicleTransferRequests = async (id: string) =>
  unwrapData<unknown[]>(await apiClient.get(`${base}/${id}/transfer-requests`));
export const getVehicleAuditLogs = async (id: string) =>
  unwrapData<AdminAuditLog[]>(await apiClient.get(`${base}/${id}/audit-logs`));
export const lockVehicle = async (id: string, payload: LockVehiclePayload) =>
  unwrapData<AdminVehicleDetail>(
    await apiClient.patch(`${base}/${id}/lock`, payload),
  );
export const unlockVehicle = async (id: string, payload: ReasonPayload) =>
  unwrapData<AdminVehicleDetail>(
    await apiClient.patch(`${base}/${id}/unlock`, payload),
  );
export const markVehicleNeedsInspection = async (
  id: string,
  payload: ReasonPayload,
) =>
  unwrapData<AdminVehicleDetail>(
    await apiClient.patch(`${base}/${id}/mark-needs-inspection`, payload),
  );
export const markVehicleMaintenance = async (
  id: string,
  payload: MaintenancePayload,
) =>
  unwrapData<AdminVehicleDetail>(
    await apiClient.patch(`${base}/${id}/mark-maintenance`, payload),
  );
export const deactivateVehicle = async (id: string, payload: ReasonPayload) =>
  unwrapData<AdminVehicleDetail>(
    await apiClient.patch(`${base}/${id}/deactivate`, payload),
  );
export const createIdentifierCorrectionRequest = async (
  id: string,
  payload: { field: "vin"; oldValue: string; newValue: string; reason: string },
) =>
  unwrapData<unknown>(
    await apiClient.post(
      `${base}/${id}/identifier-correction-requests`,
      payload,
    ),
  );
