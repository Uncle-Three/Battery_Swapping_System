import apiClient from './apiClient';
import { API_ENDPOINTS } from '../constants/endpoints';
import type { User, Profile } from '../types';

export const authService = {
  login: async (credentials: any): Promise<{ token: string; user: User }> => {
    // In actual implementation, request to API_ENDPOINTS.AUTH.LOGIN
    // return (await apiClient.post(API_ENDPOINTS.AUTH.LOGIN, credentials)).data;
    
    // Mock implementation for development
    console.log('Mock login called with:', credentials);
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          token: 'mock-jwt-token',
          user: {
            id: 'u-1',
            email: credentials.email || 'customer@example.com',
            name: credentials.email?.split('@')[0] || 'John Doe',
            role: credentials.role || 'MEMBER',
            createdAt: new Date().toISOString(),
          },
        });
      }, 500);
    });
  },

  register: async (data: any): Promise<{ user: User }> => {
    const response = await apiClient.post(API_ENDPOINTS.AUTH.REGISTER, data);
    return response.data;
  },

  getProfile: async (): Promise<Profile> => {
    const response = await apiClient.get(API_ENDPOINTS.AUTH.PROFILE);
    return response.data;
  },
};
