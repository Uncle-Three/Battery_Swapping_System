import { Router } from "express";
import { paymentController } from "./payment.controller";
import { authenticate } from "../../common/middleware/authenticate.middleware";
import { validate } from "../../common/middleware/validate.middleware";
import { vnpayCallbackSchema } from "./payment.validation";
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
