import { Router } from "express";
import { authenticate } from "../../common/middleware/authenticate.middleware";
import { authorize } from "../../common/middleware/authorize.middleware";
import { validate } from "../../common/middleware/validate.middleware";
import { vehicleTransferController as ctrl } from "./vehicle-transfer.controller";
import {
  createTransferRequestSchema,
  uploadDocumentsSchema,
  transferRequestParamSchema,
  adminApproveSchema,
  adminRejectSchema,
  adminRequestInfoSchema,
  adminListTransfersSchema,
  vehicleLookupQuerySchema,
  qrCodeParamSchema,
  ownershipHistoryQuerySchema,
} from "./vehicle-transfer.validation";

// ─── Vehicle lookup router (public + authenticated) ───────────────────────────
export const vehicleLookupRouter = Router();

/**
 * @swagger
 * /vehicles/lookup:
 *   get:
 *     summary: Look up a vehicle by VIN or plate number
 *     tags: [Vehicles]
 *     parameters:
 *       - in: query
 *         name: vin
 *         schema: { type: string }
 *       - in: query
 *         name: plateNumber
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Vehicle lookup result
 */
vehicleLookupRouter.get(
  "/lookup",
  authenticate,
  validate({ query: vehicleLookupQuerySchema.shape.query }),
  ctrl.lookupVehicle,
);

/**
 * @swagger
 * /vehicles/qr/{qrCode}:
 *   get:
 *     summary: Look up a vehicle by QR code
 *     tags: [Vehicles]
 */
vehicleLookupRouter.get(
  "/qr/:qrCode",
  authenticate,
  validate({ params: qrCodeParamSchema.shape.params }),
  ctrl.lookupVehicleByQr,
);

// ─── Ownership history (attached to vehicle) ──────────────────────────────────
/**
 * @swagger
 * /vehicles/{vehicleId}/ownership-history:
 *   get:
 *     summary: Get ownership history of a vehicle
 *     tags: [Vehicle Transfer]
 *     security:
 *       - bearerAuth: []
 */
vehicleLookupRouter.get(
  "/:vehicleId/ownership-history",
  authenticate,
  validate({ params: ownershipHistoryQuerySchema.shape.params, query: ownershipHistoryQuerySchema.shape.query }),
  ctrl.getOwnershipHistory,
);

// ─── Transfer requests router (member) ───────────────────────────────────────
export const vehicleTransferRouter = Router();
vehicleTransferRouter.use(authenticate, authorize("MEMBER"));

/**
 * @swagger
 * /vehicle-transfer-requests:
 *   post:
 *     summary: Create a vehicle transfer request (draft)
 *     tags: [Vehicle Transfer]
 *     security:
 *       - bearerAuth: []
 */
vehicleTransferRouter.post(
  "/",
  validate({ body: createTransferRequestSchema.shape.body }),
  ctrl.createTransferRequest,
);

/**
 * @swagger
 * /vehicle-transfer-requests/my-requests:
 *   get:
 *     summary: Get current user's transfer requests
 *     tags: [Vehicle Transfer]
 *     security:
 *       - bearerAuth: []
 */
vehicleTransferRouter.get("/my-requests", ctrl.getMyRequests);

/**
 * @swagger
 * /vehicle-transfer-requests/{id}:
 *   get:
 *     summary: Get a transfer request by ID
 *     tags: [Vehicle Transfer]
 *     security:
 *       - bearerAuth: []
 */
vehicleTransferRouter.get("/:id", validate({ params: transferRequestParamSchema.shape.params }), ctrl.getRequestDetail);

/**
 * @swagger
 * /vehicle-transfer-requests/{id}/documents:
 *   post:
 *     summary: Upload or update documents for a transfer request
 *     tags: [Vehicle Transfer]
 *     security:
 *       - bearerAuth: []
 */
vehicleTransferRouter.post(
  "/:id/documents",
  validate({ params: uploadDocumentsSchema.shape.params, body: uploadDocumentsSchema.shape.body }),
  ctrl.uploadDocuments,
);

/**
 * @swagger
 * /vehicle-transfer-requests/{id}/submit:
 *   post:
 *     summary: Submit a draft transfer request for review
 *     tags: [Vehicle Transfer]
 *     security:
 *       - bearerAuth: []
 */
vehicleTransferRouter.post(
  "/:id/submit",
  validate({ params: transferRequestParamSchema.shape.params }),
  ctrl.submitRequest,
);

/**
 * @swagger
 * /vehicle-transfer-requests/{id}/cancel:
 *   patch:
 *     summary: Cancel a pending transfer request
 *     tags: [Vehicle Transfer]
 *     security:
 *       - bearerAuth: []
 */
vehicleTransferRouter.patch(
  "/:id/cancel",
  validate({ params: transferRequestParamSchema.shape.params }),
  ctrl.cancelRequest,
);

// ─── Admin transfer management router ────────────────────────────────────────
export const adminVehicleTransferRouter = Router();
adminVehicleTransferRouter.use(authenticate, authorize("ADMIN", "MANAGER"));

/**
 * @swagger
 * /admin/vehicle-transfer-requests:
 *   get:
 *     summary: List all vehicle transfer requests (admin)
 *     tags: [Admin Vehicle Transfer]
 *     security:
 *       - bearerAuth: []
 */
adminVehicleTransferRouter.get(
  "/",
  validate({ query: adminListTransfersSchema.shape.query }),
  ctrl.adminListRequests,
);

/**
 * @swagger
 * /admin/vehicle-transfer-requests/{id}:
 *   get:
 *     summary: Get transfer request detail (admin)
 *     tags: [Admin Vehicle Transfer]
 *     security:
 *       - bearerAuth: []
 */
adminVehicleTransferRouter.get(
  "/:id",
  validate({ params: transferRequestParamSchema.shape.params }),
  ctrl.adminGetRequestDetail,
);

/**
 * @swagger
 * /admin/vehicle-transfer-requests/{id}/request-information:
 *   patch:
 *     summary: Request additional information from requester
 *     tags: [Admin Vehicle Transfer]
 *     security:
 *       - bearerAuth: []
 */
adminVehicleTransferRouter.patch(
  "/:id/request-information",
  authorize("ADMIN"),
  validate({ params: adminRequestInfoSchema.shape.params, body: adminRequestInfoSchema.shape.body }),
  ctrl.adminRequestInfo,
);

/**
 * @swagger
 * /admin/vehicle-transfer-requests/{id}/approve:
 *   patch:
 *     summary: Approve a vehicle transfer request
 *     tags: [Admin Vehicle Transfer]
 *     security:
 *       - bearerAuth: []
 */
adminVehicleTransferRouter.patch(
  "/:id/approve",
  authorize("ADMIN"),
  validate({ params: adminApproveSchema.shape.params, body: adminApproveSchema.shape.body }),
  ctrl.adminApprove,
);

/**
 * @swagger
 * /admin/vehicle-transfer-requests/{id}/reject:
 *   patch:
 *     summary: Reject a vehicle transfer request
 *     tags: [Admin Vehicle Transfer]
 *     security:
 *       - bearerAuth: []
 */
adminVehicleTransferRouter.patch(
  "/:id/reject",
  authorize("ADMIN"),
  validate({ params: adminRejectSchema.shape.params, body: adminRejectSchema.shape.body }),
  ctrl.adminReject,
);
