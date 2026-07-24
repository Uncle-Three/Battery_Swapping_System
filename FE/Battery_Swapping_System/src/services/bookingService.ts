import { API_ENDPOINTS } from '../constants/endpoints';
import type { Booking } from '../types';
import apiClient, { unwrapData } from './apiClient';

export type VehicleOption = { id: string; name: string; plateNumber: string; status: string; vehicleModel?: { manufacturer: string; name: string } | null };
export type CreateBookingInput = {
  vehicleId: string; stationId: string;
  startAt?: string; endAt?: string;
  scheduledStart?: string; scheduledEnd?: string;
  slotId?: string; serviceBayId?: string;
  replacementRequestId?: string; reason?: string;
};
export type BookingQuote = { amount: number; currency: string; mandatory: boolean; priority: number; reason?: string | null; scheduledStart: string; scheduledEnd: string };
export type BookingDetail = Booking & {
  reason?: string | null; rejectionReason?: string | null;
  cancellation?: { reason?: string | null; cancelledAt: string; cancelledBy?: { id: string; fullName: string } | null; actorRole: string } | null;
  station: { id: string; name: string; address: string }; slot?: { id: string; slotNumber: number } | null;
  serviceBay?: { id: string; bayCode: string; bayName: string } | null;
  vehicle?: { id: string; name: string; plateNumber: string; vinNumber?: string | null; brand?: string | null; model?: string | null; manufactureYear?: number | null; color?: string | null; batteryType?: string | null; } | null;
  battery?: { id: string; serialNumber: string; safetyState: string } | null;
  replacementRequest?: { id: string; mandatory: boolean; reason: string; status: string } | null;
  approvalHistory: Array<{ id: string; action: string; reason?: string | null; beforeStatus: string; afterStatus: string; createdAt: string; manager: { fullName: string } }>;
  slotReservations: Array<{ id: string; status: string; startsAt: string; endsAt: string; slot: { slotNumber: number } }>;
  batteryReservations: Array<{ id: string; status: string; battery: { serialNumber: string } }>;
  transactions: Array<{ id: string; workflowStatus: string; status: string; staff?: { id: string; fullName: string; phone?: string | null; email?: string | null } | null; invoice?: unknown; inspection?: unknown; stepHistory: Array<{ id: string; fromStatus?: string | null; toStatus: string; createdAt: string; data?: any }>; payments: unknown[] }>;
};

export const bookingService = {
  getMyVehicles: async () => unwrapData<VehicleOption[]>(await apiClient.get(API_ENDPOINTS.USERS.VEHICLES)),
  getAll: async () => unwrapData<BookingDetail[]>(await apiClient.get(API_ENDPOINTS.BOOKINGS.LIST)),
  getById: async (id: string) => unwrapData<BookingDetail>(await apiClient.get(API_ENDPOINTS.BOOKINGS.DETAILS(id))),
  quote: async (input: CreateBookingInput) => unwrapData<BookingQuote>(await apiClient.post(API_ENDPOINTS.BOOKINGS.QUOTE, input)),
  create: async (input: CreateBookingInput) => unwrapData<Booking>(await apiClient.post(API_ENDPOINTS.BOOKINGS.CREATE, input)),
  getActive: async () => unwrapData<Booking[]>(await apiClient.get(API_ENDPOINTS.BOOKINGS.ACTIVE)),
  cancel: async (id: string) => unwrapData<Booking>(await apiClient.post(API_ENDPOINTS.BOOKINGS.CANCEL(id))),
  confirmReschedule: async (id: string) => unwrapData<Booking>(await apiClient.post(API_ENDPOINTS.BOOKINGS.CONFIRM_RESCHEDULE(id))),
};
