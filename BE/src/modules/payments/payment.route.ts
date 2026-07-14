import { Router } from "express";
import { paymentController } from "./payment.controller";
import { authenticate } from "../../common/middleware/authenticate.middleware";
import { validate } from "../../common/middleware/validate.middleware";
import { vnpayCallbackSchema, paymentHistoryQuerySchema } from "./payment.validation";
import { objectIdParamsSchema } from "../../common/validation/object-id";

export const paymentRouter = Router();

// VNPay calls these server-to-server/browser redirect endpoints without a bearer token.
paymentRouter.get("/vnpay/ipn", validate({ query: vnpayCallbackSchema }), paymentController.vnpayIPN);
paymentRouter.get("/vnpay/return", validate({ query: vnpayCallbackSchema }), paymentController.vnpayReturn);

// ── Routes yêu cầu đăng nhập ─────────────────────────────────────────────────
paymentRouter.use(authenticate);

// VNPay: tạo payment URL (cần auth để lấy userId)

// Booking-specific payment (amount từ invoice — không nhận từ FE)
paymentRouter.get("/bookings/:id", validate({ params: objectIdParamsSchema }), paymentController.getBookingPaymentStatus);
paymentRouter.post("/bookings/:id/vnpay", validate({ params: objectIdParamsSchema }), paymentController.initiateVNPayBookingPayment);

// ── Payment History ───────────────────────────────────────────────────────────

/** GET /payments/history — User xem lịch sử thanh toán của chính mình */
paymentRouter.get("/history", validate({ query: paymentHistoryQuerySchema }), paymentController.getMyHistory);

/** GET /payments/admin/history — Admin/Manager xem tất cả giao dịch */
paymentRouter.get("/admin/history", validate({ query: paymentHistoryQuerySchema }), paymentController.getAllHistory);
