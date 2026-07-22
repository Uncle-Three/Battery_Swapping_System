import { Router } from "express";
import { authenticate } from "../../common/middleware/authenticate.middleware";
import { authorize } from "../../common/middleware/authorize.middleware";
import { validate } from "../../common/middleware/validate.middleware";
import { accountRecoveryController as ctrl } from "./account-recovery.controller";
import {
  forgotPasswordSchema,
  verifyResetOtpSchema,
  resetPasswordSchema,
  requestPhoneChangeSchema,
  verifyPhoneChangeSchema,
  manualRecoverySchema,
  adminReviewRecoverySchema,
  listRecoveryRequestsSchema,
} from "./account-recovery.validation";

// Public auth recovery routes (mounted at /api/auth)
export const authRecoveryRouter = Router();

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     summary: Request a password reset OTP
 *     tags: [Account Recovery]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: OTP sent (always returns success to prevent enumeration)
 */
authRecoveryRouter.post(
  "/forgot-password",
  validate({ body: forgotPasswordSchema.shape.body }),
  accountRecoveryController.forgotPassword,
);

/**
 * @swagger
 * /auth/verify-reset-otp:
 *   post:
 *     summary: Verify a password reset OTP
 *     tags: [Account Recovery]
 */
authRecoveryRouter.post(
  "/verify-reset-otp",
  validate({ body: verifyResetOtpSchema.shape.body }),
  accountRecoveryController.verifyResetOtp,
);

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     summary: Reset password using verified OTP
 *     tags: [Account Recovery]
 */
authRecoveryRouter.post(
  "/reset-password",
  validate({ body: resetPasswordSchema.shape.body }),
  accountRecoveryController.resetPassword,
);

// Authenticated account-management routes (mounted at /api/account)
export const accountManagementRouter = Router();
accountManagementRouter.use(authenticate);

/**
 * @swagger
 * /account/change-phone/request:
 *   post:
 *     summary: Request a phone number change OTP
 *     tags: [Account Recovery]
 *     security:
 *       - bearerAuth: []
 */
accountManagementRouter.post(
  "/change-phone/request",
  validate({ body: requestPhoneChangeSchema.shape.body }),
  accountRecoveryController.requestPhoneChange,
);

/**
 * @swagger
 * /account/change-phone/verify:
 *   post:
 *     summary: Verify phone change OTP and apply new phone number
 *     tags: [Account Recovery]
 *     security:
 *       - bearerAuth: []
 */
accountManagementRouter.post(
  "/change-phone/verify",
  validate({ body: verifyPhoneChangeSchema.shape.body }),
  accountRecoveryController.verifyPhoneChange,
);

/**
 * @swagger
 * /account/manual-recovery-request:
 *   post:
 *     summary: Submit a manual account recovery request for admin review
 *     tags: [Account Recovery]
 */
accountManagementRouter.post(
  "/manual-recovery-request",
  validate({ body: manualRecoverySchema.shape.body }),
  accountRecoveryController.requestManualRecovery,
);

// Admin recovery management routes (mounted at /api/admin/account-recovery-requests)
export const adminRecoveryRouter = Router();
adminRecoveryRouter.use(authenticate, authorize("ADMIN"));

/**
 * @swagger
 * /admin/account-recovery-requests:
 *   get:
 *     summary: List account recovery requests
 *     tags: [Admin Account Recovery]
 *     security:
 *       - bearerAuth: []
 */
adminRecoveryRouter.get(
  "/",
  validate({ query: listRecoveryRequestsSchema.shape.query }),
  accountRecoveryController.listRecoveryRequests,
);

/**
 * @swagger
 * /admin/account-recovery-requests/{id}/approve:
 *   patch:
 *     summary: Approve an account recovery request
 *     tags: [Admin Account Recovery]
 *     security:
 *       - bearerAuth: []
 */
adminRecoveryRouter.patch(
  "/:id/approve",
  validate({ params: adminReviewRecoverySchema.shape.params, body: adminReviewRecoverySchema.shape.body }),
  accountRecoveryController.approveRecovery,
);

/**
 * @swagger
 * /admin/account-recovery-requests/{id}/reject:
 *   patch:
 *     summary: Reject an account recovery request
 *     tags: [Admin Account Recovery]
 *     security:
 *       - bearerAuth: []
 */
adminRecoveryRouter.patch(
  "/:id/reject",
  validate({ params: adminReviewRecoverySchema.shape.params, body: adminReviewRecoverySchema.shape.body }),
  accountRecoveryController.rejectRecovery,
);

// re-export controller for route file import convenience
import { accountRecoveryController } from "./account-recovery.controller";
