import { z } from "zod";

const objectIdParam = z.string().min(1, "ID is required");

export const vehicleLookupQuerySchema = z.object({
  query: z.object({
    vin: z.string().min(1).optional(),
    plateNumber: z.string().min(1).optional(),
  }).refine((d) => d.vin || d.plateNumber, { message: "Either vin or plateNumber is required" }),
});

export const qrCodeParamSchema = z.object({
  params: z.object({
    qrCode: z.string().min(1, "QR code is required"),
  }),
});

export const createTransferRequestSchema = z.object({
  body: z.object({
    vehicleId: objectIdParam,
    requestType: z.enum(["USED_VEHICLE_PURCHASE", "LOST_OLD_ACCOUNT", "CHANGED_PHONE_NUMBER", "OTHER"]),
    reason: z.string().max(2000).optional(),
  }),
});

export const uploadDocumentsSchema = z.object({
  params: z.object({ id: objectIdParam }),
  body: z.object({
    registrationDocumentUrl: z.string().url("Must be a valid URL").optional(),
    identityDocumentUrl: z.string().url("Must be a valid URL").optional(),
    purchaseContractUrl: z.string().url("Must be a valid URL").optional(),
    additionalDocumentUrls: z.array(z.string().url()).max(10).optional().default([]),
  }),
});

export const transferRequestParamSchema = z.object({
  params: z.object({ id: objectIdParam }),
});

export const adminApproveSchema = z.object({
  params: z.object({ id: objectIdParam }),
  body: z.object({
    adminNotes: z.string().max(2000).optional(),
  }),
});

export const adminRejectSchema = z.object({
  params: z.object({ id: objectIdParam }),
  body: z.object({
    rejectionReason: z.string().min(10, "Rejection reason must be at least 10 characters").max(1000),
    adminNotes: z.string().max(2000).optional(),
  }),
});

export const adminRequestInfoSchema = z.object({
  params: z.object({ id: objectIdParam }),
  body: z.object({
    additionalInfoRequest: z.string().min(10, "Request must be at least 10 characters").max(2000),
    adminNotes: z.string().max(2000).optional(),
  }),
});

export const adminListTransfersSchema = z.object({
  query: z.object({
    status: z
      .enum(["DRAFT", "PENDING", "UNDER_REVIEW", "NEED_MORE_INFORMATION", "APPROVED", "REJECTED", "CANCELLED"])
      .optional(),
    requestType: z
      .enum(["USED_VEHICLE_PURCHASE", "LOST_OLD_ACCOUNT", "CHANGED_PHONE_NUMBER", "OTHER"])
      .optional(),
    vin: z.string().optional(),
    plateNumber: z.string().optional(),
    page: z.coerce.number().int().min(0).default(0),
    size: z.coerce.number().int().min(1).max(100).default(20),
    sortField: z.string().default("createdAt"),
    sortDirection: z.enum(["asc", "desc"]).default("desc"),
  }),
});

export const ownershipHistoryQuerySchema = z.object({
  params: z.object({ vehicleId: objectIdParam }),
  query: z.object({
    page: z.coerce.number().int().min(0).default(0),
    size: z.coerce.number().int().min(1).max(100).default(20),
  }),
});
