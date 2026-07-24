import apiClient, { unwrapData } from './apiClient';
import type { BulkSlotPayload, SlotStatus } from '../components/admin/bay-slots/types';

export type BayTimeSlot = {
  id: string;
  startAt: string;
  endAt: string;
  displayStartTime: string;
  displayEndTime: string;
  status: SlotStatus;
  bookingId: string | null;
  offReason: string | null;
  blockedReason: string | null;
  note: string | null;
};

export type BaySlotDateResult = {
  date: string;
  bays: Array<{
    bayId: string;
    bayCode: string;
    bayName: string;
    bayStatus: string;
    slots: BayTimeSlot[];
  }>;
  pagination: { page: number; limit: number; total: number };
};

export const adminBaySlotApi = {
  getBaySlotsByDate: async (
    stationId: string,
    params: { date: string; bayId?: string; status?: SlotStatus; search?: string; page?: number; limit?: number },
  ) => unwrapData<BaySlotDateResult>(
    await apiClient.get(`/admin/stations/${stationId}/bay-slots`, { params }),
  ),

  createBaySlotsBulk: async (stationId: string, payload: BulkSlotPayload) => {
    const response = await apiClient.post<{
      success: boolean;
      summary: { requested: number; created: number; available: number; off: number; skipped: number };
      skippedSlots: Array<{ bayId: string; date: string; startTime: string; endTime: string; reason: string }>;
    }>(`/admin/stations/${stationId}/bay-slots/bulk`, {
      bayIds: Array.from(new Set(payload.slots.map((slot) => slot.bayId))),
      dateFrom: payload.dateFrom,
      dateTo: payload.dateTo,
      daysOfWeek: payload.daysOfWeek,
      openingTime: payload.openingTime,
      closingTime: payload.closingTime,
      slotDurationMinutes: payload.slotDurationMinutes,
      bufferMinutes: payload.bufferMinutes,
      slots: payload.slots,
    });
    return response.data;
  },

  createSingleBaySlot: async (
    bayId: string,
    payload: { date: string; startTime: string; endTime: string; status: 'AVAILABLE' | 'OFF' | 'BLOCKED'; reason?: string; note?: string },
  ) => unwrapData<BayTimeSlot>(await apiClient.post(`/admin/bays/${bayId}/slots`, payload)),

  updateBaySlotStatus: async (
    slotId: string,
    status: 'AVAILABLE' | 'OFF' | 'BLOCKED',
    reason?: string,
  ) => unwrapData<BayTimeSlot>(
    await apiClient.patch(`/admin/bay-slots/${slotId}/status`, { status, reason }),
  ),

  updateBaySlotsBulkStatus: async (
    slotIds: string[],
    status: 'AVAILABLE' | 'OFF' | 'BLOCKED',
    reason?: string,
  ) => (await apiClient.patch('/admin/bay-slots/bulk-status', { slotIds, status, reason })).data,

  deleteBaySlot: async (slotId: string) =>
    unwrapData<{ id: string }>(await apiClient.delete(`/admin/bay-slots/${slotId}`)),
};

export const getAvailableBaySlots = async (stationId: string, date: string) =>
  unwrapData<BayTimeSlot[]>(
    await apiClient.get(`/stations/${stationId}/available-bay-slots`, { params: { date } }),
  );

