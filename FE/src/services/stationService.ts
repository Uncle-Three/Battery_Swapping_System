import apiClient, { unwrapData } from './apiClient';
import { API_ENDPOINTS } from '../constants/endpoints';
import type { Station } from '../types';

export type AvailabilityResult = {
  batteryTypeId: string;
  slots: Array<{ id: string; slotNumber: number; batteries: Array<{ id: string; serialNumber: string }> }>;
};
export type BookingScheduleWindow = { id: string; serviceBayId: string; bayCode: string; bayName: string; startsAt: string; endsAt: string; durationMinutes: number; status: 'AVAILABLE' | 'FULL' | 'PAST'; batterySlotId: string | null; availableBatteryCount: number };
export type BookingSchedule = { station: { id: string; name: string; openingTime: string; closingTime: string }; date: string; durationMinutes: number; windows: BookingScheduleWindow[] };

export const stationService = {
  getStations: async (): Promise<Station[]> =>
    unwrapData<Station[]>(await apiClient.get(API_ENDPOINTS.STATIONS.LIST)),
  getStationDetails: async (id: string): Promise<Station> =>
    unwrapData<Station>(await apiClient.get(API_ENDPOINTS.STATIONS.DETAILS(id))),
  getStationSlots: async (id: string) =>
    unwrapData(await apiClient.get(API_ENDPOINTS.STATIONS.SLOTS(id))),
  getAvailability: async (stationId: string, vehicleId: string, startsAt: string, endsAt: string): Promise<AvailabilityResult[]> =>
    unwrapData<AvailabilityResult[]>(await apiClient.get(API_ENDPOINTS.STATIONS.AVAILABILITY(stationId), {
      params: { vehicleId, startsAt, endsAt },
    })),
  getBookingSchedule: async (stationId: string, vehicleId: string, date: string, durationMinutes: 30 | 60): Promise<BookingSchedule> =>
    unwrapData<BookingSchedule>(await apiClient.get(API_ENDPOINTS.STATIONS.BOOKING_SCHEDULE(stationId), { params: { vehicleId, date, durationMinutes } })),
};
