import { UserRole } from '../constants/roles';
import { API_ENDPOINTS } from '../constants/endpoints';
import apiClient, { unwrapData } from './apiClient';
import type { PermissionMatrix, User, UserStatus } from '../types';
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
};
