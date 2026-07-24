// ─── Vehicle Transfer Types ───────────────────────────────────────────────────

export type VehicleOwnershipStatus = "ACTIVE" | "TRANSFER_PENDING" | "LOCKED" | "INACTIVE";

export type VehicleTransferRequestType =
  | "USED_VEHICLE_PURCHASE"
  | "LOST_OLD_ACCOUNT"
  | "CHANGED_PHONE_NUMBER"
  | "OTHER";

export type VehicleTransferRequestStatus =
  | "DRAFT"
  | "PENDING"
  | "UNDER_REVIEW"
  | "NEED_MORE_INFORMATION"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED";

export interface VehicleLookupVehicleInfo {
  id: string;
  plateNumber: string;
  vinNumber?: string;
  qrCode?: string;
  brand?: string;
  model?: string;
  manufactureYear?: number;
  batteryType: string;
  ownershipStatus: VehicleOwnershipStatus;
  status: string;
}

export interface MaskedOwnerInfo {
  maskedEmail?: string;
  maskedPhone?: string;
}

export interface VehicleLookupResponse {
  found: boolean;
  vehicle?: VehicleLookupVehicleInfo;
  hasActiveOwner: boolean;
  isOwnedByCurrentUser: boolean;
  maskedOwnerInfo?: MaskedOwnerInfo;
  transferRequestAllowed: boolean;
  activeTransferStatus?: VehicleTransferRequestStatus;
  message: string;
}

export interface UploadedDocument {
  url: string;
  name: string;
  type: "registration" | "identity" | "contract" | "additional";
}

export interface VehicleTransferRequest {
  id: string;
  vehicleId: string;
  currentOwnerId?: string;
  requestedOwnerId: string;
  requestType: VehicleTransferRequestType;
  reason?: string;
  registrationDocumentUrl?: string;
  identityDocumentUrl?: string;
  purchaseContractUrl?: string;
  additionalDocumentUrls: string[];
  status: VehicleTransferRequestStatus;
  submittedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
  adminNotes?: string;
  additionalInfoRequest?: string;
  vehicle?: {
    id: string;
    plateNumber: string;
    vinNumber?: string;
    brand?: string;
    model?: string;
    ownershipStatus: VehicleOwnershipStatus;
  };
  createdAt: string;
  updatedAt: string;
}

export interface VehicleOwnershipHistory {
  id: string;
  vehicleId: string;
  previousOwnerId?: string;
  newOwnerId: string;
  transferRequestId?: string;
  transferReason?: string;
  transferredBy?: string;
  transferredAt: string;
  notes?: string;
}

export interface SanitizedSwapRecord {
  id: string;
  stationId: string;
  batteryInId?: string;
  batteryInSoc?: number;
  batteryOutId?: string;
  batteryOutSoc?: number;
  workflowStatus: string;
  startedAt: string;
  completedAt?: string;
}

export interface VehicleTechnicalHistory {
  vehicleId: string;
  swapTransactions: {
    content: SanitizedSwapRecord[];
    totalElements: number;
    page: number;
    size: number;
    totalPages: number;
  };
  batteryHistory: Array<{
    id: string;
    vehicleId: string;
    batteryId: string;
    installedAt: string;
    removedAt?: string;
    current: boolean;
    battery?: { id: string; batteryCode: string; soh: number; healthClassification: string };
  }>;
  maintenanceRecords: Array<{
    id: string;
    batteryId: string;
    soh: number;
    soc: number;
    status: string;
    severity?: string;
    notes?: string;
    createdAt: string;
  }>;
  healthLogs: Array<{
    id: string;
    batteryId: string;
    soc: number;
    soh: number;
    temperature: number;
    voltage: number;
    safetyState: string;
    recordedAt: string;
  }>;
}

export interface PaginatedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export interface ApiError {
  success: false;
  message: string;
  code?: string;
  errors?: unknown;
  requestId?: string;
}

// ─── Account Recovery Types ───────────────────────────────────────────────────

export type AccountRecoveryRequestStatus = "PENDING" | "UNDER_REVIEW" | "APPROVED" | "REJECTED";

export interface AccountRecoveryRequest {
  id: string;
  userId?: string;
  contactEmail: string;
  contactPhone?: string;
  description: string;
  documentUrls: string[];
  status: AccountRecoveryRequestStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  adminNotes?: string;
  rejectionReason?: string;
  resolvedAction?: string;
  createdAt: string;
  updatedAt: string;
}
