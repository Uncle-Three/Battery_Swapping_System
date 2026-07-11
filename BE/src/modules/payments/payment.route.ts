import { Router } from "express";
import { paymentController } from "./payment.controller";
import { authenticate } from "../../common/middleware/authenticate.middleware";

export const paymentRouter = Router();

// ── Routes yêu cầu đăng nhập ─────────────────────────────────────────────────
paymentRouter.use(authenticate);
paymentRouter.get("/wallet", paymentController.getWallet);
paymentRouter.post("/wallet/topups", paymentController.createTopup);
paymentRouter.post("/subscriptions/purchase", paymentController.purchaseSubscription);

// VNPay: tạo payment URL (cần auth để lấy userId)
paymentRouter.post("/vnpay/create-payment", paymentController.initiateVNPayTopup);

// ── Routes PUBLIC (không cần đăng nhập) ─────────────────────────────────────
// IPN: VNPay gọi server-to-server, không có Bearer token
paymentRouter.get("/vnpay/ipn", paymentController.vnpayIPN);

// Return: user redirect về từ VNPay, FE đọc kết quả
paymentRouter.get("/vnpay/return", paymentController.vnpayReturn);
