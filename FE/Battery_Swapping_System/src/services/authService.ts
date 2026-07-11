import apiClient, { unwrapData } from './apiClient';
import { API_ENDPOINTS } from '../constants/endpoints';
import type { LoginCredentials, Profile, RegisterInput, UpdateProfileInput, User } from '../types';
import { mapProfileDto, mapUserDto } from './responseMappers';

type AuthResponse = {
  accessToken: string;
  tokenType: 'Bearer';
  user: User;
};

const sanitizeRegisterInput = (data: RegisterInput): RegisterInput => ({
  email: data.email,
  password: data.password,
  name: data.name,
  ...(data.phone ? { phone: data.phone } : {}),
  ...(data.avatarUrl ? { avatarUrl: data.avatarUrl } : {}),
});

const sanitizeProfileInput = (data: UpdateProfileInput): Omit<UpdateProfileInput, 'fullName'> => ({
  ...(data.name !== undefined ? { name: data.name } : {}),
  ...(data.phone !== undefined ? { phone: data.phone } : {}),
  ...(data.avatarUrl !== undefined ? { avatarUrl: data.avatarUrl } : {}),
});

export const authService = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await apiClient.post(API_ENDPOINTS.AUTH.LOGIN, credentials);
    const data = unwrapData<AuthResponse>(response);
    return { ...data, user: mapUserDto(data.user) };
  },

  register: async (data: RegisterInput): Promise<{ user: User }> => {
    const response = await apiClient.post(API_ENDPOINTS.AUTH.REGISTER, sanitizeRegisterInput(data));
    const result = unwrapData<{ user: User }>(response);
    return { user: mapUserDto(result.user) };
  },

  getProfile: async (): Promise<Profile> => {
    const response = await apiClient.get(API_ENDPOINTS.USERS.ME);
    return mapProfileDto(unwrapData<Profile>(response));
  },

  updateProfile: async (data: UpdateProfileInput): Promise<Profile> => {
    const response = await apiClient.patch(API_ENDPOINTS.USERS.ME, sanitizeProfileInput(data));
    return mapProfileDto(unwrapData<Profile>(response));
  },

  logout: async (): Promise<void> => {
    await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT);
  },
};
