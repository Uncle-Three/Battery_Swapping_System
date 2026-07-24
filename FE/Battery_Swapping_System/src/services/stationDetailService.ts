import apiClient, { unwrapData } from './apiClient';
import type { Station } from '../types';

export type ServiceBay = { id: string; stationId: string; bayCode: string; bayName: string; status: 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'INACTIVE'; defaultDurationMinutes: number; description?: string | null; createdAt: string; updatedAt: string };
export type ReplacementSlot = { id: string; stationId: string; bayId: string; date: string; startTime: string; endTime: string; capacity: number; bookedCount: number; reservedCount: number; status: 'AVAILABLE' | 'FULL' | 'TEMPORARILY_RESERVED' | 'BLOCKED' | 'MAINTENANCE' | 'CANCELLED' | 'COMPLETED'; recurrence?: Record<string, unknown> | null };
export type StationOverviewData = { station: Station; totalBays: number; availableBays: number; maintenanceBays: number; totalSlotsToday: number; availableSlotsToday: number; fullSlotsToday: number; todayBookings: number; availableBatteries: number; reservedBatteries: number; inspectionBatteries: number; maintenanceBatteries: number; manager: { id: string; fullName: string; email: string } | null; assignedStaffCount: number; recentBookings: any[]; recentIncidents: any[]; lowInventoryAlerts: number };
export type PageResult<T> = { items: T[]; total: number; page: number; limit: number };
export type StationBooking = {
  id: string;
  bookingCode: string;
  status: string;
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
  createdAt: string;
  user?: { fullName?: string | null; email?: string | null } | null;
  vehicle?: { name?: string | null; model?: string | null; plateNumber?: string | null; batteryType?: string | null } | null;
  battery?: { batteryType?: { code?: string | null } | null } | null;
  serviceBay?: { bayCode?: string | null } | null;
  slot?: { slotNumber?: number | string | null } | null;
  transactions?: Array<{ staff?: { id: string; fullName?: string | null } | null }>;
};
export type StationBookingPage = PageResult<StationBooking> & {
  batteryTypes: string[];
  summary: { totalToday: number; pending: number; confirmed: number; checkedIn: number; completed: number; cancelled: number };
};
export type StationAssignment = { id: string; userId: string; stationId: string; assignmentRole: 'MANAGER' | 'STAFF' | 'TECHNICIAN'; shift?: string | null; active: boolean; effectiveFrom: string; effectiveTo?: string | null; user: { id: string; fullName: string; email: string; phone?: string | null; role: { name: string } } };
export type MaintenanceEvent = { id: string; type: string; relatedEntityLabel?: string | null; title: string; description: string; severity: string; status: string; startTime: string; expectedCompletion?: string | null; actualCompletion?: string | null; resolution?: string | null; assignedStaff?: { id: string; fullName: string } | null; createdBy?: { id: string; fullName: string } | null; createdAt: string };
const root = (stationId: string) => `/admin/stations/${stationId}`;

export const stationDetailService = { get: async (id: string) => unwrapData<Station>(await apiClient.get(root(id))), updateStatus: async (id: string, status: Station['status']) => unwrapData<Station>(await apiClient.put(root(id), { status })) };
export const stationOverviewService = { get: async (id: string) => unwrapData<StationOverviewData>(await apiClient.get(`${root(id)}/overview`)) };
export const bayService = { list: async (id: string) => unwrapData<ServiceBay[]>(await apiClient.get(`${root(id)}/bays`)), create: async (id: string, data: Omit<ServiceBay, 'id' | 'stationId' | 'createdAt' | 'updatedAt'>) => unwrapData<ServiceBay>(await apiClient.post(`${root(id)}/bays`, data)), update: async (id: string, bayId: string, data: Partial<ServiceBay>) => unwrapData<ServiceBay>(await apiClient.patch(`${root(id)}/bays/${bayId}`, data)), remove: async (id: string, bayId: string) => unwrapData(await apiClient.delete(`${root(id)}/bays/${bayId}`)) };
export const slotService = { list: async (id: string, params?: Record<string, unknown>) => unwrapData<ReplacementSlot[]>(await apiClient.get(`${root(id)}/slots`, { params })), create: async (id: string, data: Omit<ReplacementSlot, 'id' | 'stationId' | 'bookedCount' | 'reservedCount'>) => unwrapData<ReplacementSlot>(await apiClient.post(`${root(id)}/slots`, data)), update: async (id: string, slotId: string, data: Partial<ReplacementSlot>) => unwrapData<ReplacementSlot>(await apiClient.patch(`${root(id)}/slots/${slotId}`, data)), remove: async (id: string, slotId: string) => unwrapData(await apiClient.delete(`${root(id)}/slots/${slotId}`)) };
export const stationInventoryService = { list: async (id: string, params: Record<string, unknown>) => unwrapData<PageResult<any>>(await apiClient.get(`${root(id)}/inventory`, { params })), update: async (id: string, batteryId: string, data: Record<string, unknown>) => unwrapData<any>(await apiClient.patch(`${root(id)}/inventory/${batteryId}`, data)), history: async (id: string, batteryId: string) => unwrapData<any[]>(await apiClient.get(`${root(id)}/inventory/${batteryId}/history`)) };
export const stationBookingService = {
  list: async (id: string, params: Record<string, unknown>) =>
    unwrapData<StationBookingPage>(await apiClient.get(`${root(id)}/bookings`, { params })),
  cancel: async (stationId: string, bookingId: string, reason: string) =>
    unwrapData<StationBooking>(
      await apiClient.patch(`${root(stationId)}/bookings/${bookingId}/cancel`, { reason }),
    ),
};
export const stationAssignmentService = { list: async (id: string) => unwrapData<StationAssignment[]>(await apiClient.get(`${root(id)}/assignments`)), candidates: async (id: string) => unwrapData<any[]>(await apiClient.get(`${root(id)}/assignment-candidates`)), create: async (id: string, data: Record<string, unknown>) => unwrapData<StationAssignment>(await apiClient.post(`${root(id)}/assignments`, data)), update: async (id: string, assignmentId: string, data: Record<string, unknown>) => unwrapData<StationAssignment>(await apiClient.patch(`${root(id)}/assignments/${assignmentId}`, data)), remove: async (id: string, assignmentId: string) => unwrapData(await apiClient.delete(`${root(id)}/assignments/${assignmentId}`)) };
export const stationMaintenanceService = { list: async (id: string, params: Record<string, unknown>) => unwrapData<PageResult<MaintenanceEvent>>(await apiClient.get(`${root(id)}/maintenance`, { params })), create: async (id: string, data: Record<string, unknown>) => unwrapData<MaintenanceEvent>(await apiClient.post(`${root(id)}/maintenance`, data)), update: async (id: string, maintenanceId: string, data: Record<string, unknown>) => unwrapData<MaintenanceEvent>(await apiClient.patch(`${root(id)}/maintenance/${maintenanceId}`, data)) };
export const stationReportService = { get: async (id: string, params: Record<string, unknown>) => unwrapData<any>(await apiClient.get(`${root(id)}/reports`, { params })) };
export const stationAuditLogService = { list: async (id: string, params: Record<string, unknown>) => unwrapData<PageResult<any>>(await apiClient.get(`${root(id)}/audit-logs`, { params })) };
