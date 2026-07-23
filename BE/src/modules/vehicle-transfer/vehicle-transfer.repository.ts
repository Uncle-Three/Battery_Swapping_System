import { prisma } from "../../config/database";
import type { VehicleTransferRequestStatus, VehicleOwnershipStatus } from "./vehicle-transfer.types";

export const vehicleTransferRepository = {
  // ─── Vehicle Lookup ────────────────────────────────────────────────────────

  findVehicleByVin: (vin: string) =>
    prisma.vehicle.findFirst({
      where: { vinNumber: vin, isDeleted: false },
      include: { user: { include: { role: true } } },
    }),

  findVehicleByPlate: (plateNumber: string) =>
    prisma.vehicle.findFirst({
      where: { plateNumber: plateNumber.toUpperCase(), isDeleted: false },
      include: { user: { include: { role: true } } },
    }),

  findVehicleByQrCode: (qrCode: string) =>
    prisma.vehicle.findFirst({
      where: { qrCode, isDeleted: false },
      include: { user: { include: { role: true } } },
    }),

  findVehicleById: (vehicleId: string) =>
    prisma.vehicle.findFirst({
      where: { id: vehicleId, isDeleted: false },
      include: { user: { include: { role: true } } },
    }),

  // ─── Transfer Request CRUD ─────────────────────────────────────────────────

  findActiveTransferForVehicleAndRequester: (vehicleId: string, requestedOwnerId: string) =>
    prisma.vehicleTransferRequest.findFirst({
      where: {
        vehicleId,
        requestedOwnerId,
        status: { notIn: ["APPROVED", "REJECTED", "CANCELLED"] },
      },
    }),

  findActiveTransferForVehicle: (vehicleId: string) =>
    prisma.vehicleTransferRequest.findFirst({
      where: {
        vehicleId,
        status: { notIn: ["APPROVED", "REJECTED", "CANCELLED"] },
      },
    }),

  findTransferRequestById: (id: string) =>
    prisma.vehicleTransferRequest.findUnique({
      where: { id },
      include: {
        vehicle: {
          include: {
            user: { select: { id: true, fullName: true, email: true, phone: true } },
          },
        },
      },
    }),

  createTransferRequest: (data: {
    vehicleId: string;
    currentOwnerId: string | null;
    requestedOwnerId: string;
    requestType: "USED_VEHICLE_PURCHASE" | "LOST_OLD_ACCOUNT" | "CHANGED_PHONE_NUMBER" | "OTHER";
    reason?: string;
  }) =>
    prisma.vehicleTransferRequest.create({ data }),

  updateTransferRequest: (id: string, data: Partial<{
    registrationDocumentUrl: string;
    identityDocumentUrl: string;
    purchaseContractUrl: string;
    additionalDocumentUrls: string[];
    status: VehicleTransferRequestStatus;
    submittedAt: Date;
    reviewedAt: Date;
    reviewedBy: string;
    rejectionReason: string;
    adminNotes: string;
    additionalInfoRequest: string;
  }>) =>
    prisma.vehicleTransferRequest.update({ where: { id }, data }),

  listTransferRequestsByUser: (requestedOwnerId: string, page: number, size: number) =>
    Promise.all([
      prisma.vehicleTransferRequest.findMany({
        where: { requestedOwnerId },
        skip: page * size,
        take: size,
        orderBy: { createdAt: "desc" },
        include: { vehicle: { select: { id: true, plateNumber: true, vinNumber: true, brand: true, model: true } } },
      }),
      prisma.vehicleTransferRequest.count({ where: { requestedOwnerId } }),
    ]),

  adminListTransferRequests: (params: {
    status?: VehicleTransferRequestStatus;
    requestType?: "USED_VEHICLE_PURCHASE" | "LOST_OLD_ACCOUNT" | "CHANGED_PHONE_NUMBER" | "OTHER";
    vin?: string;
    plateNumber?: string;
    page: number;
    size: number;
    sortField?: string;
    sortDirection?: "asc" | "desc";
  }) => {
    const where: any = {};
    if (params.status) where.status = params.status;
    if (params.requestType) where.requestType = params.requestType;
    if (params.vin || params.plateNumber) {
      where.vehicle = {};
      if (params.vin) where.vehicle = { ...where.vehicle, vinNumber: { contains: params.vin, mode: "insensitive" } };
      if (params.plateNumber) where.vehicle = { ...where.vehicle, plateNumber: { contains: params.plateNumber.toUpperCase(), mode: "insensitive" } };
    }

    const orderBy: Record<string, "asc" | "desc"> = {
      [params.sortField ?? "createdAt"]: params.sortDirection ?? "desc",
    };

    return Promise.all([
      prisma.vehicleTransferRequest.findMany({
        where,
        skip: params.page * params.size,
        take: params.size,
        orderBy,
        include: {
          vehicle: {
            select: {
              id: true,
              plateNumber: true,
              vinNumber: true,
              brand: true,
              model: true,
              ownershipStatus: true,
              user: { select: { id: true, fullName: true, email: true } },
            },
          },
        },
      }),
      prisma.vehicleTransferRequest.count({ where }),
    ]);
  },

  // ─── Ownership History ─────────────────────────────────────────────────────

  createOwnershipHistory: (data: {
    vehicleId: string;
    previousOwnerId: string | null;
    newOwnerId: string;
    transferRequestId?: string;
    transferReason?: string;
    transferredBy?: string;
    notes?: string;
  }) =>
    prisma.vehicleOwnershipHistory.create({ data }),

  listOwnershipHistory: (vehicleId: string, page: number, size: number) =>
    Promise.all([
      prisma.vehicleOwnershipHistory.findMany({
        where: { vehicleId },
        skip: page * size,
        take: size,
        orderBy: { transferredAt: "desc" },
      }),
      prisma.vehicleOwnershipHistory.count({ where: { vehicleId } }),
    ]),

  // ─── Vehicle Status Update ─────────────────────────────────────────────────

  updateVehicleOwnershipStatus: (vehicleId: string, ownershipStatus: VehicleOwnershipStatus) =>
    prisma.vehicle.update({ where: { id: vehicleId }, data: { ownershipStatus } }),

  // ─── Notifications ─────────────────────────────────────────────────────────

  createNotification: (data: { userId: string; title: string; message: string; entityType: string; entityId: string }) =>
    prisma.notification.create({
      data: {
        userId: data.userId,
        type: "VEHICLE_TRANSFER",
        title: data.title,
        message: data.message,
        entityType: data.entityType,
        entityId: data.entityId,
      },
    }),

  // ─── Audit Log ────────────────────────────────────────────────────────────

  createAuditLog: (data: {
    actorId: string;
    actorRole: string;
    action: string;
    entityType: string;
    entityId: string;
    before?: object;
    after?: object;
    ipAddress?: string;
    userAgent?: string;
  }) =>
    prisma.auditLog.create({
      data: {
        adminId: data.actorId,
        actorId: data.actorId,
        actorRole: data.actorRole,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        before: data.before ?? null,
        after: data.after ?? null,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    }),
};
