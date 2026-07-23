import type { RequestHandler } from "express";
import { paymentService } from "./payment.service";
import { createVNPayTopupSchema, paymentHistoryQuerySchema } from "./payment.validation";

export const paymentController = {
  // ── Wallet ────────────────────────────────────────────────────────────────

  getWallet: (async (req, res) => {
    const data = await paymentService.getWallet(req.user!.id);
    res.status(200).json({ success: true, data });
  }) satisfies RequestHandler,

  // ── VNPay ─────────────────────────────────────────────────────────────────

  /**
   * POST /payments/vnpay/create-payment
   * Tạo VNPay payment URL và redirect user đến trang thanh toán.
   * Yêu cầu: Bearer token (authenticate).
   */
  initiateVNPayTopup: (async (req, res) => {
    const body = createVNPayTopupSchema.parse(req.body);

    // Lấy IP của user (qua proxy thì dùng x-forwarded-for)
    const ipAddr =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      "127.0.0.1";

    const data = await paymentService.initiateVNPayTopup(req.user!.id, body, ipAddr);

    res.status(200).json({ success: true, data });
  }) satisfies RequestHandler,

  /**
   * GET /payments/vnpay/ipn
   * IPN callback từ VNPay server. KHÔNG cần authentication.
   * Response phải đúng format: { RspCode, Message }
   */
  vnpayIPN: (async (req, res) => {
    const query = req.query as Record<string, string>;
    const result = await paymentService.handleVNPayIPN(query);
    // VNPay yêu cầu HTTP 200 cho mọi response IPN
    res.status(200).json(result);
  }) satisfies RequestHandler,

  /**
   * GET /payments/vnpay/return
   * User được VNPay redirect về sau khi thanh toán. KHÔNG cần authentication.
   * Chỉ trả kết quả để FE hiển thị, không cập nhật DB.
   */
  vnpayReturn: (async (req, res) => {
    const query = req.query as Record<string, string>;
    const data = await paymentService.handleVNPayReturn(query);
    res.status(200).json({ success: true, data });
  }) satisfies RequestHandler,

  // ── Booking Payment ────────────────────────────────────────────────────────

  /**
   * GET /payments/bookings/:bookingId
   * Trả về booking + swap + invoice + wallet để FE hiển thị payment page.
   */
  getBookingPaymentStatus: (async (req, res) => {
    const bookingId = String(req.params.id);
    const data = await paymentService.getBookingPaymentStatus(req.user!.id, bookingId);
    res.status(200).json({ success: true, data });
  }) satisfies RequestHandler,

  /**
   * POST /payments/bookings/:id/vnpay
   * Tạo VNPay URL cho booking payment. Amount từ invoice — không nhận từ FE.
   */
  initiateVNPayBookingPayment: (async (req, res) => {
    const bookingId = String(req.params.id);
    const ipAddr =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      "127.0.0.1";
    const data = await paymentService.initiateVNPayBookingPayment(req.user!.id, bookingId, ipAddr);
    res.status(200).json({ success: true, data });
  }) satisfies RequestHandler,

  // ── Payment History ────────────────────────────────────────────────────────

  /**
   * GET /payments/history
   * User xem lịch sử giao dịch của chính mình.
   */
  getMyHistory: (async (req, res) => {
    const query = paymentHistoryQuerySchema.parse(req.query);
    const data = await paymentService.getMyPaymentHistory(req.user!.id, query);
    res.status(200).json({ success: true, data });
  }) satisfies RequestHandler,

  /**
   * GET /payments/admin/history
   * Admin xem tất cả, Manager chỉ xem theo station của mình.
   */
  getAllHistory: (async (req, res) => {
    const query = paymentHistoryQuerySchema.parse(req.query);
    const data = await paymentService.getAllPaymentHistory(req.user!.id, req.user!.role, query);
    res.status(200).json({ success: true, data });
  }) satisfies RequestHandler,
};
