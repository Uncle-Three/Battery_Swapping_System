import { API_ENDPOINTS } from '../constants/endpoints';
import apiClient, { unwrapData } from './apiClient';

export type SafetyState = 'UNKNOWN' | 'SAFE' | 'WARNING' | 'UNSAFE';
export type HealthLog = { id: string; soc: number; soh: number; temperature: number; voltage: number; cycleCount: number; safetyState: SafetyState; ruleVersion: number; ruleSnapshot: Record<string, number>; dataSource: string; recordedAt: string };
export type BatteryView = { id: string; serialNumber: string; soc: number; soh: number; temperature: number; voltage: number; cycleCount: number; safetyState: SafetyState; operationalStatus: string; lastHealthCheckAt?: string | null; batteryType?: { code: string; capacityKWh: number } | null; healthLogs: HealthLog[] };
export type ReplacementRequestView = { id: string; reason: string; mandatory: boolean; priority: number; status: string; safetySnapshot: unknown; createdAt: string };
export type BookingSummary = { id: string; status: string; mandatory: boolean; priority: number; scheduledStart?: string | null; station: { id: string; name: string } };
export type VehicleView = { id: string; name: string; plateNumber: string; vinNumber?: string | null; status: string; vehicleModel?: { manufacturer: string; name: string; modelYear?: number | null } | null; batteryAssignments: Array<{ battery: BatteryView }>; replacementRequests: ReplacementRequestView[]; bookings: BookingSummary[] };
export type SafetyRuleView = { version: number; minimumSohSafe: number; minimumSohWarning: number; minimumSoc: number; maximumTemperature: number; minimumVoltage: number; maximumVoltage: number };
export type MemberDashboardData = { user: { id: string; fullName: string; email: string }; vehicles: VehicleView[]; notifications: Array<{ id: string; title: string; message: string; status: string; createdAt: string }>; safetyRule?: SafetyRuleView | null };

let dashboardCache: MemberDashboardData | null = null;
let dashboardRequest: Promise<MemberDashboardData> | null = null;
const loadDashboard = () => {
  if (dashboardCache) return Promise.resolve(dashboardCache);
  if (!dashboardRequest) dashboardRequest = apiClient.get(API_ENDPOINTS.USERS.DASHBOARD)
    .then((response) => unwrapData<MemberDashboardData>(response))
    .then((data) => { dashboardCache = data; return data; })
    .finally(() => { dashboardRequest = null; });
  return dashboardRequest;
};

export const memberService = {
  dashboard: loadDashboard,
  clearDashboardCache: () => { dashboardCache = null; dashboardRequest = null; },
  vehicles: async () => unwrapData<VehicleView[]>(await apiClient.get(API_ENDPOINTS.USERS.VEHICLES)),
  vehicle: async (id: string) => unwrapData<VehicleView>(await apiClient.get(API_ENDPOINTS.USERS.VEHICLE(id))),
};
