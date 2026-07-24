import apiClient, { unwrapData } from './apiClient';
import type { BatteryStatus } from '../constants/battery';

export type MaintenanceRecord = {
  id: string;
  batteryId: string;
  soh: number;
  soc: number;
  status: BatteryStatus;
  notes?: string;
  createdAt: string;
};

export type CreateMaintenanceRecordInput = {
  batteryId: string;
  soh: number;
  soc: number;
  status: BatteryStatus;
  notes?: string;
};

export const maintenanceService = {
  create: async (data: CreateMaintenanceRecordInput) =>
    unwrapData<MaintenanceRecord>(await apiClient.post('/api/maintenance', data)),
  list: async () =>
    unwrapData<MaintenanceRecord[]>(await apiClient.get('/api/maintenance')),
};
