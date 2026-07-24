export type AdminVehicleStatus =
  | "ACTIVE"
  | "NEEDS_INSPECTION"
  | "UNSAFE"
  | "SWAP_PENDING"
  | "MAINTENANCE"
  | "TRANSFER_PENDING"
  | "LOCKED"
  | "INACTIVE";
export type BatterySafetyStatus = "SAFE" | "WARNING" | "UNSAFE" | "NO_DATA";
export type TransferStatus =
  | "NONE"
  | "PENDING"
  | "UNDER_REVIEW"
  | "NEED_MORE_INFORMATION"
  | "APPROVED"
  | "REJECTED";

export interface VehicleOwnerSummary {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  status: string;
}
export interface VehicleBatterySummary {
  id: string;
  code: string;
  serialNumber?: string | null;
  soh: number;
  soc: number;
  cycleCount?: number;
  safetyStatus: BatterySafetyStatus;
  healthClassification?: string;
  lastInspectionAt: string | null;
}
export interface VehicleTransferSummary {
  id: string;
  status: Exclude<TransferStatus, "NONE"> | "DRAFT" | "CANCELLED";
  createdAt: string;
}
export interface AdminVehicleListItem {
  id: string;
  plateNumber: string;
  vinNumber: string | null;
  qrCode: string | null;
  model: string | null;
  manufacturer: string | null;
  productionYear: number | null;
  imageUrl: string | null;
  odo: number;
  status: AdminVehicleStatus;
  createdAt: string;
  owner: VehicleOwnerSummary;
  battery: VehicleBatterySummary | null;
  transfer: VehicleTransferSummary | null;
}
export interface VehicleStatistics {
  total: number;
  active: number;
  needsInspection: number;
  unsafe: number;
  transferPending: number;
  locked: number;
}
export interface AdminVehicleListResponse {
  items: AdminVehicleListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  statistics: VehicleStatistics;
}
export interface AdminVehicleFilters {
  search?: string;
  status?: AdminVehicleStatus;
  batterySafety?: BatterySafetyStatus;
  transferStatus?: TransferStatus;
  manufacturer?: string;
  model?: string;
  productionYear?: number;
  minOdo?: number;
  maxOdo?: number;
  minSoh?: number;
  maxSoh?: number;
  createdFrom?: string;
  createdTo?: string;
  lastInspectionFrom?: string;
  lastInspectionTo?: string;
  page: number;
  limit: 10 | 20 | 50 | 100;
  sortBy:
    | "createdAt"
    | "currentMileageKm"
    | "soh"
    | "plateNumber"
    | "lastInspectionAt";
  sortOrder: "asc" | "desc";
}
export interface AdminVehicleDetail extends Omit<
  AdminVehicleListItem,
  "manufacturer" | "productionYear" | "imageUrl" | "odo"
> {
  name: string;
  brand: string | null;
  manufactureYear: number | null;
  vehicleImageUrl: string | null;
  currentMileageKm: number | null;
  color: string | null;
  batteryType: string;
  ownershipStartDate: string;
  updatedAt: string;
  preferredStationId: string | null;
  battery: VehicleBatterySummary | null;
  transfer: VehicleTransferSummary | null;
  lastSwap: {
    id: string;
    createdAt: string;
    station?: { name: string };
  } | null;
}
export interface AdminAuditLog {
  id: string;
  createdAt: string;
  action: string;
  details: string | null;
  before: unknown;
  after: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  admin: { fullName: string; email: string } | null;
}
export interface VehicleSwapHistoryItem {
  id: string;
  code: string;
  bookingId: string | null;
  createdAt: string;
  startedAt: string;
  completedAt: string | null;
  status: string;
  vehicle: {
    plateNumber?: string;
    vinNumber?: string;
    model?: string;
    odo?: number;
    ownerName?: string;
  };
  station: { id: string; code: string; name: string };
  staff: { id: string; fullName: string } | null;
  oldBattery: {
    id: string;
    code: string;
    serialNumber: string | null;
    soh?: number;
    soc?: number;
  } | null;
  newBattery: {
    id: string;
    code: string;
    serialNumber: string | null;
    soh?: number;
    soc?: number;
  } | null;
  payment: { amount: number; method: string; status: string } | null;
}
export interface ReasonPayload {
  reason: string;
  notes?: string;
}
export interface LockVehiclePayload extends ReasonPayload {
  category:
    | "OWNERSHIP_DISPUTE"
    | "REPORTED_STOLEN"
    | "FRAUD_SUSPECTED"
    | "INVALID_VIN"
    | "SAFETY_RISK"
    | "OTHER";
}
export interface MaintenancePayload extends ReasonPayload {
  stationId: string;
  expectedStartDate: string;
  expectedCompletionDate?: string;
}
