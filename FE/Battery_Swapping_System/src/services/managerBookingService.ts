import { API_ENDPOINTS } from '../constants/endpoints';
import apiClient, { unwrapData } from './apiClient';

export type ManagerBooking = {
  id: string; status: string; mandatory: boolean; priority: number; reason?: string | null; scheduledStart?: string | null; scheduledEnd?: string | null; costEstimate?: number | null;
  user: { id: string; fullName: string; email: string; phone?: string | null };
  vehicle?: { id: string; name: string; plateNumber: string; vin?: string | null; color?: string | null; currentMileageKm?: number | null; batteryType?: string | null; vehicleModel?: { manufacturer: string; name: string } | null; batteryAssignments?: Array<{ battery: { serialNumber: string; safetyState: string; soh: number; soc: number; temperature: number; voltage: number; healthLogs: unknown[] } }> } | null;
  station: { id: string; name: string; address: string }; slot?: { id: string; slotNumber: number } | null;
  serviceBay?: { id: string; bayCode: string; bayName: string } | null;
  battery?: { id: string; serialNumber: string; safetyState: string } | null;
  replacementRequest?: { id: string; reason: string; mandatory: boolean; priority: number; status: string; safetySnapshot?: unknown } | null;
  cancellation?: { reason?: string | null; cancelledAt: string; cancelledBy?: { id: string; fullName: string } | null; actorRole: string } | null;
  approvalHistory?: Array<{ id: string; action: string; reason?: string | null; createdAt: string; manager: { fullName: string } }>;
  transactions?: Array<{ id: string; workflowStatus: string; createdAt: string; staff?: { fullName: string } | null; stepHistory?: Array<{ id: string; fromStatus?: string | null; toStatus: string; createdAt: string; data?: any }> }>;
};

export const managerBookingService = {
  pending: async () => unwrapData<ManagerBooking[]>(await apiClient.get(API_ENDPOINTS.MANAGER_BOOKINGS.PENDING)),
  history: async () => unwrapData<ManagerBooking[]>(await apiClient.get(API_ENDPOINTS.MANAGER_BOOKINGS.HISTORY)),
  details: async (id: string) => unwrapData<ManagerBooking>(await apiClient.get(API_ENDPOINTS.MANAGER_BOOKINGS.DETAILS(id))),
  approve: async (id: string) => unwrapData(await apiClient.post(API_ENDPOINTS.MANAGER_BOOKINGS.APPROVE(id))),
  reject: async (id: string, reason: string) => unwrapData(await apiClient.post(API_ENDPOINTS.MANAGER_BOOKINGS.REJECT(id), { reason })),
  reschedule: async (id: string, input: { slotId: string; scheduledStart: string; scheduledEnd: string; reason: string }) => unwrapData(await apiClient.post(API_ENDPOINTS.MANAGER_BOOKINGS.RESCHEDULE(id), input)),
};
