import { API_ENDPOINTS } from '../constants/endpoints';
import apiClient, { unwrapData } from './apiClient';
import type { SwapTransaction } from '../types';
export type StaffBayBooking = { id: string; stationId: string; serviceBayId: string; status: string; scheduledStart?: string; scheduledEnd?: string; mandatory?: boolean; reason?: string | null; user: { fullName: string; email: string; phone?: string }; vehicle?: { name: string; plateNumber: string; batteryType?: string | null }; battery?: { serialNumber: string } };
export type StaffServiceBay = { id: string; bayCode: string; bayName: string; status: string; defaultDurationMinutes: number; bookings: StaffBayBooking[] };
export type StaffStation = { id: string; name: string; address: string; serviceBays: StaffServiceBay[] };
export type StaffBooking = { id: string; stationId: string; serviceBayId?: string | null; status: string; scheduledStart?: string; scheduledEnd?: string; reason?: string | null; mandatory?: boolean; user: { fullName: string; email: string; phone?: string }; vehicle?: { name: string; plateNumber: string; batteryType?: string | null; }; battery?: { serialNumber: string }; serviceBay?: StaffServiceBay | null; station?: StaffStation };
export type StaffSwap = { id: string; workflowStatus: string; createdAt: string; nextActions?: string[]; booking?: StaffBooking; vehicle?: { name: string; plateNumber: string; batteryType?: string | null; }; batteryIn?: { serialNumber: string; soc: number; soh: number; temperature: number; voltage: number }; batteryOut?: { serialNumber: string; soc: number; soh: number }; inspection?: unknown; stepHistory?: Array<{ id: string; fromStatus?: string; toStatus: string; createdAt: string }> };
export type ScannedBatteryInfo = { battery: { id: string; batteryCode: string; qrCodeValue?: string | null; serialNumber?: string | null; soc: number; soh: number; temperature?: number | null; voltage?: number | null; cycleCount: number; operationalStatus: string; safetyState: string; healthClassification: string; accumulatedMileageKm?: number | null }; estimate: { estimatedSoh: number; accumulatedMileageKm: number; ageYears: number; healthClassification: string; explanation: string }; expectedForCurrentStep: boolean };
export type InspectionInput = { serialNumber: string; soc: number; soh: number; temperature?: number; voltage?: number; physicalCondition: string; outcome: 'AVAILABLE' | 'MAINTENANCE' | 'QUARANTINED' | 'RETIRED'; notes?: string };
export const swapService = {
  context: async () => unwrapData<{ stations: StaffStation[], activeSwap: StaffSwap | null }>(await apiClient.get(API_ENDPOINTS.SWAP.CONTEXT)),
  history: async () => unwrapData<StaffSwap[]>(await apiClient.get(API_ENDPOINTS.SWAP.STAFF_HISTORY)),
  lookup: async (bookingId: string, stationId: string) => unwrapData<StaffBooking>(await apiClient.post(API_ENDPOINTS.SWAP.LOOKUP, { bookingId, stationId })),
  checkIn: async (bookingId: string, stationId: string, serviceBayId: string) => unwrapData<StaffSwap>(await apiClient.post(API_ENDPOINTS.SWAP.CHECK_IN(bookingId), { stationId, serviceBayId })),
  get: async (id: string) => unwrapData<StaffSwap>(await apiClient.get(API_ENDPOINTS.SWAP.DETAILS(id))),
  verify: async (id: string) => unwrapData<StaffSwap>(await apiClient.post(API_ENDPOINTS.SWAP.VERIFY(id))),
  scanBattery: async (id: string, serialNumber: string) => unwrapData<ScannedBatteryInfo>(await apiClient.post(API_ENDPOINTS.SWAP.SCAN_BATTERY(id), { serialNumber })),
  remove: async (id: string, serialNumber: string, soc: number) => unwrapData<StaffSwap>(await apiClient.post(API_ENDPOINTS.SWAP.REMOVE(id), { serialNumber, soc })),
  inspect: async (id: string, input: InspectionInput) => unwrapData<StaffSwap>(await apiClient.post(API_ENDPOINTS.SWAP.INSPECT(id), input)),
  assign: async (id: string, serialNumber: string) => unwrapData<StaffSwap>(await apiClient.post(API_ENDPOINTS.SWAP.ASSIGN(id), { serialNumber })),
  install: async (id: string, serialNumber: string) => unwrapData<StaffSwap>(await apiClient.post(API_ENDPOINTS.SWAP.INSTALL(id), { serialNumber })),
  requestDirectPayment: async (id: string) => unwrapData<StaffSwap>(await apiClient.post(API_ENDPOINTS.SWAP.COLLECT_PAYMENT(id), {})),
  rollback: async (id: string, reason: string) => unwrapData<StaffSwap>(await apiClient.post(API_ENDPOINTS.SWAP.ROLLBACK(id), { reason })),
  getSwapHistory: async () => unwrapData<SwapTransaction[]>(await apiClient.get(API_ENDPOINTS.SWAP.HISTORY)),
};
