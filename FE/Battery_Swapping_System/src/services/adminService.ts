import { UserRole } from '../constants/roles';
import { API_ENDPOINTS } from '../constants/endpoints';
import apiClient, { unwrapData } from './apiClient';
import type { PermissionMatrix, Station, User, UserStatus } from '../types';
import { mapUserDto } from './responseMappers';

export const adminService = {
  getUsers: async (): Promise<User[]> => {
    const response = await apiClient.get(API_ENDPOINTS.ADMIN.USERS);
    return unwrapData<User[]>(response).map(mapUserDto);
  },

  updateUserRole: async (id: string, role: UserRole): Promise<User> => {
    const response = await apiClient.patch(API_ENDPOINTS.ADMIN.USER_ROLE(id), { role });
    return mapUserDto(unwrapData<User>(response));
  },

  updateUserStatus: async (id: string, status: UserStatus): Promise<User> => {
    const response = await apiClient.patch(API_ENDPOINTS.ADMIN.USER_STATUS(id), { status });
    return mapUserDto(unwrapData<User>(response));
  },

  getRoles: async (): Promise<UserRole[]> => {
    const response = await apiClient.get(API_ENDPOINTS.ADMIN.ROLES);
    return unwrapData<UserRole[]>(response);
  },

  getPermissions: async (): Promise<PermissionMatrix> => {
    const response = await apiClient.get(API_ENDPOINTS.ADMIN.PERMISSIONS);
    return unwrapData<PermissionMatrix>(response);
  },
  getSettings: async () => unwrapData<Array<{ id: string; key: string; value: string }>>(await apiClient.get(API_ENDPOINTS.ADMIN.SETTINGS)),
  updateSetting: async (key: string, value: string) => unwrapData<{ id: string; key: string; value: string }>(await apiClient.put(API_ENDPOINTS.ADMIN.SETTING(key), { value })),
  getAuditLogs: async (params?: { limit?: number; offset?: number; action?: string }) => unwrapData<{ items: any[]; total: number }>(await apiClient.get('/admin/audit-logs', { params })),
  
  // Stations
  getStations: async () => unwrapData<Station[]>(await apiClient.get('/admin/stations')),
  createStation: async (data: Omit<Station, 'id' | 'slots'>) => unwrapData<Station>(await apiClient.post('/admin/stations', data)),
  updateStation: async (id: string, data: Partial<Omit<Station, 'id' | 'slots'>>) => unwrapData<Station>(await apiClient.put(`/admin/stations/${id}`, data)),
  deleteStation: async (id: string) => unwrapData<any>(await apiClient.delete(`/admin/stations/${id}`)),

  // Vehicle Models
  getVehicleModels: async () => unwrapData<any[]>(await apiClient.get('/admin/vehicle-models')),
  createVehicleModel: async (data: any) => unwrapData<any>(await apiClient.post('/admin/vehicle-models', data)),
  updateVehicleModel: async (id: string, data: any) => unwrapData<any>(await apiClient.put(`/admin/vehicle-models/${id}`, data)),
  deleteVehicleModel: async (id: string) => unwrapData<any>(await apiClient.delete(`/admin/vehicle-models/${id}`)),

  // Battery Types
  getBatteryTypes: async () => unwrapData<any[]>(await apiClient.get('/admin/battery-types')),
  createBatteryType: async (data: any) => unwrapData<any>(await apiClient.post('/admin/battery-types', data)),
  updateBatteryType: async (id: string, data: any) => unwrapData<any>(await apiClient.put(`/admin/battery-types/${id}`, data)),
  deleteBatteryType: async (id: string) => unwrapData<any>(await apiClient.delete(`/admin/battery-types/${id}`)),

  // Compatibilities
  getCompatibilities: async () => unwrapData<any[]>(await apiClient.get('/admin/compatibilities')),
  createCompatibility: async (data: any) => unwrapData<any>(await apiClient.post('/admin/compatibilities', data)),
  updateCompatibility: async (id: string, data: any) => unwrapData<any>(await apiClient.put(`/admin/compatibilities/${id}`, data)),
  deleteCompatibility: async (id: string) => unwrapData<any>(await apiClient.delete(`/admin/compatibilities/${id}`)),

  // Safety Rules
  getSafetyRules: async () => unwrapData<any[]>(await apiClient.get('/admin/safety-rules')),
  createSafetyRule: async (data: any) => unwrapData<any>(await apiClient.post('/admin/safety-rules', data)),
  updateSafetyRule: async (id: string, data: any) => unwrapData<any>(await apiClient.put(`/admin/safety-rules/${id}`, data)),
  deleteSafetyRule: async (id: string) => unwrapData<any>(await apiClient.delete(`/admin/safety-rules/${id}`)),

  // Station Assignments
  getStationAssignments: async () => unwrapData<any[]>(await apiClient.get('/admin/station-assignments')),
  createStationAssignment: async (data: any) => unwrapData<any>(await apiClient.post('/admin/station-assignments', data)),
  deleteStationAssignment: async (id: string) => unwrapData<any>(await apiClient.delete(`/admin/station-assignments/${id}`)),

  // Vehicles
  getVehicles: async (params?: any) => unwrapData<any>(await apiClient.get('/admin/vehicles', { params })),
};
