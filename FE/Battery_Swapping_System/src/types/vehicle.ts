export type VehicleStatus = "ACTIVE" | "INACTIVE" | "IN_SWAP_PROCESS" | "IN_SERVICE";
export type BatteryStatus = "IN_USE" | "WAITING_INSPECTION" | "CHARGING" | "READY" | "LIMITED" | "MAINTENANCE" | "QUARANTINED" | "RETIRED";
export type BatteryHealthClassification = "HEALTHY" | "LIMITED" | "NEEDS_MAINTENANCE" | "REPLACEMENT_REQUIRED" | "UNSAFE" | "UNKNOWN";
export type BatteryHealthSource = "AGE_BASED_ESTIMATION" | "LIFECYCLE_SIMULATION" | "SIMULATED_DIAGNOSTIC" | "MANUAL_INSPECTION" | "UNKNOWN";
export type BatteryOwnershipType = "OWNED" | "SUBSCRIPTION" | "LEASED" | "UNKNOWN";

export interface BatterySummary {
  id: string;
  batteryCode: string;
  qrCodeValue: string;
  batteryType: string;
  estimatedSoH?: number;
  healthClassification: BatteryHealthClassification;
  healthSource: BatteryHealthSource;
  status: BatteryStatus;
  cycleCount?: number;
  lastInspectionAt?: string;
  lastSwappedAt?: string;
}

export interface Vehicle {
  id: string;
  ownerId: string;
  plateNumber: string;
  vin?: string;
  brand: string;
  model: string;
  manufactureYear: number;
  purchaseDate: string;
  currentMileageKm: number;
  batteryType: string;
  batteryOwnershipType: BatteryOwnershipType;
  color?: string;
  currentBattery?: BatterySummary;
  status: VehicleStatus;
  swapEligible: boolean;
  activeBookingId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleBatteryHistory {
  id: string;
  vehicleId: string;
  batteryId: string;
  installedAt: string;
  removedAt?: string;
  installedStationId?: string;
  removedStationId?: string;
  installedByStaffId?: string;
  removedByStaffId?: string;
  installationReason?: string;
  removalReason?: string;
  current: boolean;
  battery: BatterySummary;
}

export interface VehicleMileageHistory {
  id: string;
  vehicleId: string;
  previousMileageKm?: number;
  newMileageKm: number;
  differenceKm?: number;
  recordedAt: string;
  recordedBy?: string;
  note?: string;
}

export interface BatteryQrData {
  batteryId: string;
  batteryCode: string;
  qrCodeValue: string;
  scanUrl: string;
}

export interface SwapEligibility {
  eligible: boolean;
  reason?: string;
}

export interface PagedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}
