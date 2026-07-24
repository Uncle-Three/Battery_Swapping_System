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

export type VehicleOwnershipStatus = "ACTIVE" | "TRANSFER_PENDING" | "LOCKED" | "INACTIVE";

/** Status transitions allowed */
export const ALLOWED_TRANSITIONS: Record<VehicleTransferRequestStatus, VehicleTransferRequestStatus[]> = {
  DRAFT: ["PENDING", "CANCELLED"],
  PENDING: ["UNDER_REVIEW", "NEED_MORE_INFORMATION", "APPROVED", "REJECTED", "CANCELLED"],
  UNDER_REVIEW: ["NEED_MORE_INFORMATION", "APPROVED", "REJECTED", "CANCELLED"],
  NEED_MORE_INFORMATION: ["PENDING", "UNDER_REVIEW", "APPROVED", "REJECTED", "CANCELLED"],
  APPROVED: [],
  REJECTED: [],
  CANCELLED: [],
};

export type CreateTransferRequestInput = {
  vehicleId: string;
  requestType: VehicleTransferRequestType;
  reason?: string;
};

export type UploadTransferDocumentsInput = {
  registrationDocumentUrl?: string;
  identityDocumentUrl?: string;
  purchaseContractUrl?: string;
  additionalDocumentUrls?: string[];
};

export type AdminApproveTransferInput = {
  adminNotes?: string;
};

export type AdminRejectTransferInput = {
  rejectionReason: string;
  adminNotes?: string;
};

export type AdminRequestInfoInput = {
  additionalInfoRequest: string;
  adminNotes?: string;
};

export type TransferListFilter = {
  status?: VehicleTransferRequestStatus;
  requestType?: VehicleTransferRequestType;
  vin?: string;
  plateNumber?: string;
  page: number;
  size: number;
  sortField?: string;
  sortDirection?: "asc" | "desc";
};

export type VehicleLookupResult = {
  found: boolean;
  vehicle?: {
    id: string;
    plateNumber: string;
    vinNumber?: string;
    qrCode?: string;
    brand?: string;
    model?: string;
    manufactureYear?: number;
    batteryType: string;
    ownershipStatus: string;
    status: string;
  };
  hasActiveOwner: boolean;
  isOwnedByCurrentUser: boolean;
  maskedOwnerInfo?: {
    maskedEmail?: string;
    maskedPhone?: string;
  };
  transferRequestAllowed: boolean;
  activeTransferStatus?: string;
  message: string;
};
