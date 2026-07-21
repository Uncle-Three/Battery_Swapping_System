import { API_ENDPOINTS } from '../constants/endpoints';
import apiClient, { unwrapData } from './apiClient';
import type { Notification } from '../types';

export const notificationService = {
  getAll: async () =>
    unwrapData<Notification[]>(await apiClient.get(API_ENDPOINTS.NOTIFICATIONS.LIST)),
  markRead: async (id: string) =>
    unwrapData<Notification>(await apiClient.patch(API_ENDPOINTS.NOTIFICATIONS.MARK_READ(id))),
};
