import { prisma } from "../../config/database";
import { vehicleTransferRepository as repo } from "./vehicle-transfer.repository";
import { AppError } from "../../common/errors/app-error";
import { NotFoundError } from "../../common/errors/not-found-error";
import { ForbiddenError } from "../../common/errors/forbidden-error";
import { ConflictError } from "../../common/errors/conflict-error";
import { BadRequestError } from "../../common/errors/bad-request-error";
import { ALLOWED_TRANSITIONS } from "./vehicle-transfer.types";
import type {
  CreateTransferRequestInput,
  UploadTransferDocumentsInput,
  AdminApproveTransferInput,
  AdminRejectTransferInput,
  AdminRequestInfoInput,
  TransferListFilter,
  VehicleLookupResult,
} from "./vehicle-transfer.types";

type RequestContext = { ipAddress?: string; userAgent?: string };

// ─── Masking Helpers ──────────────────────────────────────────────────────────

const maskEmail = (email: string): string => {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "***@***.***";
  const visible = local.length > 2 ? local[0] + "***" : "***";
  return `${visible}@${domain}`;
};

const maskPhone = (phone: string): string => {
  if (!phone || phone.length < 4) return "******";
  return `******${phone.slice(-4)}`;
};

// ─── Vehicle Lookup ────────────────────────────────────────────────────────────

export const lookupVehicle = async (
  params: { vin?: string; plateNumber?: string; qrCode?: string },
  requestingUserId?: string,
): Promise<VehicleLookupResult> => {
  let vehicle: Awaited<ReturnType<typeof repo.findVehicleByVin>> | null = null;

  if (params.vin) {
    vehicle = await repo.findVehicleByVin(params.vin.toUpperCase().trim());
  } else if (params.plateNumber) {
    vehicle = await repo.findVehicleByPlate(params.plateNumber.toUpperCase().trim());
  } else if (params.qrCode) {
    vehicle = await repo.findVehicleByQrCode(params.qrCode.trim());
  }

  if (!vehicle) {
    return {
      found: false,
      hasActiveOwner: false,
      isOwnedByCurrentUser: false,
      transferRequestAllowed: false,
      message: "Vehicle not found. You can register it as a new vehicle.",
    };
  }

  const isOwnedByCurrentUser = requestingUserId ? vehicle.userId === requestingUserId : false;
  const hasActiveOwner = vehicle.userId != null && !vehicle.isDeleted;

  const activeTransfer = await repo.findActiveTransferForVehicle(vehicle.id);

  return {
    found: true,
    vehicle: {
      id: vehicle.id,
      plateNumber: vehicle.plateNumber,
      vinNumber: vehicle.vinNumber ?? undefined,
      qrCode: vehicle.qrCode ?? undefined,
      brand: vehicle.brand ?? undefined,
      model: vehicle.model ?? undefined,
      manufactureYear: vehicle.manufactureYear ?? undefined,
      batteryType: vehicle.batteryType,
      ownershipStatus: vehicle.ownershipStatus,
      status: vehicle.status,
    },
    hasActiveOwner,
    isOwnedByCurrentUser,
    maskedOwnerInfo: hasActiveOwner && !isOwnedByCurrentUser
      ? {
          maskedEmail: vehicle.user?.email ? maskEmail(vehicle.user.email) : undefined,
          maskedPhone: vehicle.user?.phone ? maskPhone(vehicle.user.phone) : undefined,
        }
      : undefined,
    transferRequestAllowed: hasActiveOwner && !isOwnedByCurrentUser && vehicle.ownershipStatus !== "LOCKED",
    activeTransferStatus: activeTransfer?.status,
    message: isOwnedByCurrentUser
      ? "This vehicle is already in your account."
      : hasActiveOwner
      ? "This vehicle is already linked to another account. Please recover the previous account or submit an ownership transfer request."
      : "Vehicle found. You can register it.",
  };
};

// ─── Create Transfer Request ───────────────────────────────────────────────────

export const createTransferRequest = async (requestedOwnerId: string, input: CreateTransferRequestInput) => {
  const vehicle = await repo.findVehicleById(input.vehicleId);
  if (!vehicle) throw new NotFoundError("Vehicle not found");
  if (vehicle.isDeleted) throw new NotFoundError("Vehicle not found");

  // Prevent owner from creating a transfer for their own vehicle via this flow
  if (vehicle.userId === requestedOwnerId) {
    throw new ConflictError("This vehicle is already in your account.");
  }

  if (vehicle.ownershipStatus === "LOCKED") {
    throw new AppError("This vehicle is locked and cannot be transferred at this time.", 403);
  }

  // Prevent duplicate active requests for same vehicle + requester
  const existingRequest = await repo.findActiveTransferForVehicleAndRequester(input.vehicleId, requestedOwnerId);
  if (existingRequest) {
    throw new ConflictError("You already have an active transfer request for this vehicle.");
  }

  const request = await repo.createTransferRequest({
    vehicleId: input.vehicleId,
    currentOwnerId: vehicle.userId,
    requestedOwnerId,
    requestType: input.requestType,
    reason: input.reason,
  });

  return request;
};

// ─── Upload Documents ─────────────────────────────────────────────────────────

export const uploadTransferDocuments = async (
  requestId: string,
  requestedOwnerId: string,
  input: UploadTransferDocumentsInput,
) => {
  const request = await repo.findTransferRequestById(requestId);
  if (!request) throw new NotFoundError("Transfer request not found");
  if (request.requestedOwnerId !== requestedOwnerId) throw new ForbiddenError("Access denied");
  if (request.status !== "DRAFT" && request.status !== "NEED_MORE_INFORMATION") {
    throw new BadRequestError(`Cannot update documents when request status is ${request.status}`);
  }

  return repo.updateTransferRequest(requestId, {
    registrationDocumentUrl: input.registrationDocumentUrl,
    identityDocumentUrl: input.identityDocumentUrl,
    purchaseContractUrl: input.purchaseContractUrl,
    additionalDocumentUrls: input.additionalDocumentUrls ?? [],
  });
};

// ─── Submit Transfer Request ──────────────────────────────────────────────────

export const submitTransferRequest = async (
  requestId: string,
  requestedOwnerId: string,
  ctx: RequestContext,
) => {
  const request = await repo.findTransferRequestById(requestId);
  if (!request) throw new NotFoundError("Transfer request not found");
  if (request.requestedOwnerId !== requestedOwnerId) throw new ForbiddenError("Access denied");

  if (!ALLOWED_TRANSITIONS[request.status].includes("PENDING")) {
    throw new BadRequestError(`Cannot submit request with status ${request.status}`);
  }

  // Validate required documents based on request type
  validateDocumentsForType(request);

  const [updatedRequest] = await Promise.all([
    repo.updateTransferRequest(requestId, {
      status: "PENDING",
      submittedAt: new Date(),
    }),
    // Set vehicle to TRANSFER_PENDING
    repo.updateVehicleOwnershipStatus(request.vehicleId, "TRANSFER_PENDING"),
    // Audit log
    repo.createAuditLog({
      actorId: requestedOwnerId,
      actorRole: "MEMBER",
      action: "VEHICLE_TRANSFER_REQUEST_CREATED",
      entityType: "VehicleTransferRequest",
      entityId: requestId,
      after: { status: "PENDING", vehicleId: request.vehicleId },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    }),
  ]);

  return updatedRequest;
};

const validateDocumentsForType = (request: { requestType: string; registrationDocumentUrl: string | null; identityDocumentUrl: string | null; purchaseContractUrl: string | null }) => {
  if (!request.registrationDocumentUrl) {
    throw new BadRequestError("Vehicle registration document is required");
  }
  if (!request.identityDocumentUrl) {
    throw new BadRequestError("Identity document is required");
  }
  if (request.requestType === "USED_VEHICLE_PURCHASE" && !request.purchaseContractUrl) {
    throw new BadRequestError("Purchase contract is required for used vehicle purchase transfers");
  }
};

// ─── Get My Requests ──────────────────────────────────────────────────────────

export const getMyTransferRequests = async (userId: string, page: number, size: number) => {
  const [requests, total] = await repo.listTransferRequestsByUser(userId, page, size);
  return {
    content: requests,
    page,
    size,
    totalElements: total,
    totalPages: Math.ceil(total / size),
    first: page === 0,
    last: page >= Math.ceil(total / size) - 1 || total === 0,
  };
};

// ─── Get Request Detail ───────────────────────────────────────────────────────

export const getTransferRequestDetail = async (requestId: string, userId: string, userRole: string) => {
  const request = await repo.findTransferRequestById(requestId);
  if (!request) throw new NotFoundError("Transfer request not found");

  const isRequester = request.requestedOwnerId === userId;
  const isCurrentOwner = request.vehicle?.userId === userId;
  const isAdminOrManager = ["ADMIN", "MANAGER"].includes(userRole);

  if (!isRequester && !isCurrentOwner && !isAdminOrManager) {
    throw new ForbiddenError("Access denied");
  }

  return request;
};

// ─── Cancel Request ───────────────────────────────────────────────────────────

export const cancelTransferRequest = async (requestId: string, userId: string, ctx: RequestContext) => {
  const request = await repo.findTransferRequestById(requestId);
  if (!request) throw new NotFoundError("Transfer request not found");
  if (request.requestedOwnerId !== userId) throw new ForbiddenError("Access denied");

  if (!ALLOWED_TRANSITIONS[request.status].includes("CANCELLED")) {
    throw new BadRequestError(`Cannot cancel a request with status ${request.status}`);
  }

  const wasTransferPending = request.status === "PENDING" || request.status === "UNDER_REVIEW";

  const [updated] = await Promise.all([
    repo.updateTransferRequest(requestId, { status: "CANCELLED" }),
    // Restore vehicle ownership status if needed
    wasTransferPending
      ? repo.updateVehicleOwnershipStatus(request.vehicleId, "ACTIVE")
      : Promise.resolve(null),
    repo.createAuditLog({
      actorId: userId,
      actorRole: "MEMBER",
      action: "VEHICLE_TRANSFER_REQUEST_CANCELLED",
      entityType: "VehicleTransferRequest",
      entityId: requestId,
      before: { status: request.status },
      after: { status: "CANCELLED" },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    }),
  ]);

  return updated;
};

// ─── Admin: List Requests ─────────────────────────────────────────────────────

export const adminListTransferRequests = async (filter: TransferListFilter) => {
  const [requests, total] = await repo.adminListTransferRequests(filter);
  return {
    content: requests,
    page: filter.page,
    size: filter.size,
    totalElements: total,
    totalPages: Math.ceil(total / filter.size),
    first: filter.page === 0,
    last: filter.page >= Math.ceil(total / filter.size) - 1 || total === 0,
  };
};

// ─── Admin: Request More Information ─────────────────────────────────────────

export const adminRequestMoreInformation = async (
  requestId: string,
  adminId: string,
  adminRole: string,
  input: AdminRequestInfoInput,
  ctx: RequestContext,
) => {
  const request = await repo.findTransferRequestById(requestId);
  if (!request) throw new NotFoundError("Transfer request not found");

  if (!ALLOWED_TRANSITIONS[request.status].includes("NEED_MORE_INFORMATION")) {
    throw new BadRequestError(`Cannot request more information for status ${request.status}`);
  }

  const [updated] = await Promise.all([
    repo.updateTransferRequest(requestId, {
      status: "NEED_MORE_INFORMATION",
      additionalInfoRequest: input.additionalInfoRequest,
      adminNotes: input.adminNotes,
    }),
    repo.createAuditLog({
      actorId: adminId,
      actorRole: adminRole,
      action: "VEHICLE_TRANSFER_REQUEST_REVIEWED",
      entityType: "VehicleTransferRequest",
      entityId: requestId,
      before: { status: request.status },
      after: { status: "NEED_MORE_INFORMATION" },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    }),
    // Notify requester
    repo.createNotification({
      userId: request.requestedOwnerId,
      title: "Additional Information Required",
      message: `Your vehicle transfer request requires additional information: ${input.additionalInfoRequest}`,
      entityType: "VehicleTransferRequest",
      entityId: requestId,
    }),
  ]);

  return updated;
};

// ─── Admin: Approve Transfer ──────────────────────────────────────────────────

export const adminApproveTransfer = async (
  requestId: string,
  adminId: string,
  adminRole: string,
  input: AdminApproveTransferInput,
  ctx: RequestContext,
) => {
  const request = await repo.findTransferRequestById(requestId);
  if (!request) throw new NotFoundError("Transfer request not found");

  if (!ALLOWED_TRANSITIONS[request.status].includes("APPROVED")) {
    throw new BadRequestError(`Cannot approve a request with status ${request.status}`);
  }

  // Re-verify vehicle still belongs to expected owner (prevent race condition)
  const vehicle = await repo.findVehicleById(request.vehicleId);
  if (!vehicle) throw new NotFoundError("Vehicle not found");

  if (request.currentOwnerId && vehicle.userId !== request.currentOwnerId) {
    throw new ConflictError(
      "Vehicle ownership has changed since this request was created. Please review and reject.",
    );
  }

  const previousOwnerId = vehicle.userId;
  const newOwnerId = request.requestedOwnerId;

  // Execute transfer atomically
  await prisma.$transaction(async (tx) => {
    // 1. Change vehicle owner
    await tx.vehicle.update({
      where: { id: vehicle.id },
      data: {
        userId: newOwnerId,
        ownershipStatus: "ACTIVE",
      },
    });

    // 2. Update transfer request
    await tx.vehicleTransferRequest.update({
      where: { id: requestId },
      data: {
        status: "APPROVED",
        reviewedAt: new Date(),
        reviewedBy: adminId,
        adminNotes: input.adminNotes,
      },
    });

    // 3. Create immutable ownership history
    await tx.vehicleOwnershipHistory.create({
      data: {
        vehicleId: vehicle.id,
        previousOwnerId,
        newOwnerId,
        transferRequestId: requestId,
        transferReason: request.reason ?? request.requestType,
        transferredBy: adminId,
        notes: input.adminNotes,
      },
    });

    // 4. Audit logs
    await tx.auditLog.create({
      data: {
        adminId,
        actorId: adminId,
        actorRole: adminRole,
        action: "VEHICLE_TRANSFER_APPROVED",
        entityType: "VehicleTransferRequest",
        entityId: requestId,
        before: { ownerId: previousOwnerId, status: request.status },
        after: { ownerId: newOwnerId, status: "APPROVED" },
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
    });
    await tx.auditLog.create({
      data: {
        adminId,
        actorId: adminId,
        actorRole: adminRole,
        action: "VEHICLE_OWNER_CHANGED",
        entityType: "Vehicle",
        entityId: vehicle.id,
        before: { userId: previousOwnerId },
        after: { userId: newOwnerId },
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
    });

    // 5. Notify both parties
    await tx.notification.create({
      data: {
        userId: newOwnerId,
        type: "VEHICLE_TRANSFER",
        title: "Vehicle Transfer Approved",
        message: `Your transfer request for vehicle ${vehicle.plateNumber} has been approved. The vehicle is now in your account.`,
        entityType: "Vehicle",
        entityId: vehicle.id,
      },
    });

    if (previousOwnerId) {
      await tx.notification.create({
        data: {
          userId: previousOwnerId,
          type: "VEHICLE_TRANSFER",
          title: "Vehicle Transferred",
          message: `Your vehicle ${vehicle.plateNumber} has been transferred to a new owner.`,
          entityType: "Vehicle",
          entityId: vehicle.id,
        },
      });
    }
  });

  return { message: "Transfer approved successfully. Vehicle ownership has been updated." };
};

// ─── Admin: Reject Transfer ───────────────────────────────────────────────────

export const adminRejectTransfer = async (
  requestId: string,
  adminId: string,
  adminRole: string,
  input: AdminRejectTransferInput,
  ctx: RequestContext,
) => {
  const request = await repo.findTransferRequestById(requestId);
  if (!request) throw new NotFoundError("Transfer request not found");

  if (!ALLOWED_TRANSITIONS[request.status].includes("REJECTED")) {
    throw new BadRequestError(`Cannot reject a request with status ${request.status}`);
  }

  if (!input.rejectionReason || !input.rejectionReason.trim()) {
    throw new BadRequestError("Rejection reason is required");
  }

  const vehicle = await repo.findVehicleById(request.vehicleId);

  await Promise.all([
    repo.updateTransferRequest(requestId, {
      status: "REJECTED",
      reviewedAt: new Date(),
      reviewedBy: adminId,
      rejectionReason: input.rejectionReason,
      adminNotes: input.adminNotes,
    }),
    // Restore vehicle ownership status
    vehicle?.ownershipStatus === "TRANSFER_PENDING"
      ? repo.updateVehicleOwnershipStatus(request.vehicleId, "ACTIVE")
      : Promise.resolve(),
    repo.createAuditLog({
      actorId: adminId,
      actorRole: adminRole,
      action: "VEHICLE_TRANSFER_REJECTED",
      entityType: "VehicleTransferRequest",
      entityId: requestId,
      before: { status: request.status },
      after: { status: "REJECTED", rejectionReason: input.rejectionReason },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    }),
    repo.createNotification({
      userId: request.requestedOwnerId,
      title: "Transfer Request Rejected",
      message: `Your vehicle transfer request has been rejected. Reason: ${input.rejectionReason}`,
      entityType: "VehicleTransferRequest",
      entityId: requestId,
    }),
  ]);

  return { message: "Transfer request rejected." };
};

// ─── Ownership History ─────────────────────────────────────────────────────────

export const getOwnershipHistory = async (
  vehicleId: string,
  userId: string,
  userRole: string,
  page: number,
  size: number,
) => {
  const vehicle = await repo.findVehicleById(vehicleId);
  if (!vehicle) throw new NotFoundError("Vehicle not found");

  const isOwner = vehicle.userId === userId;
  const isAdminOrManager = ["ADMIN", "MANAGER"].includes(userRole);
  if (!isOwner && !isAdminOrManager) throw new ForbiddenError("Access denied");

  const [history, total] = await repo.listOwnershipHistory(vehicleId, page, size);

  // Mask previous owner info for non-admin users
  const sanitizedHistory = isAdminOrManager
    ? history
    : history.map((h) => ({
        ...h,
        previousOwnerId: h.previousOwnerId ? "***" : null,
        newOwnerId: "***",
        transferredBy: "***",
      }));

  return {
    content: sanitizedHistory,
    page,
    size,
    totalElements: total,
    totalPages: Math.ceil(total / size),
    first: page === 0,
    last: page >= Math.ceil(total / size) - 1 || total === 0,
  };
};
