import { paymentRepository } from "./payment.repository";
import { createVNPayPaymentUrl, verifyVNPaySignature } from "../../common/utils/vnpay";
import { BadRequestError } from "../../common/errors/bad-request-error";

export const paymentService = {
  // ── Wallet ────────────────────────────────────────────────────────────────

  getWallet: async (userId: string) => {
    const wallet = await paymentRepository.findWalletByUserId(userId);
    return wallet ?? { userId, balance: 0 };
  },

  // ── Legacy ────────────────────────────────────────────────────────────────

  createTopup: (userId: string, input: unknown) =>
    paymentRepository.createTopup(userId, input),

  purchaseSubscription: (userId: string, input: unknown) =>
    paymentRepository.purchaseSubscription(userId, input),

  // ── VNPay ─────────────────────────────────────────────────────────────────

  /**
   * Bước 1: Tạo payment URL để redirect user đến trang thanh toán VNPay.
   * Lưu PaymentTransaction PENDING vào DB trước khi redirect.
   */
  initiateVNPayTopup: async (
    userId: string,
    input: { amount: number; orderInfo?: string },
    ipAddr: string
  ) => {
    const { amount, orderInfo } = input;

    // Tạo txnRef duy nhất: timestamp + 6 ký tự userId
    const txnRef = Date.now().toString() + userId.replace(/-/g, "").slice(0, 6);

    const description = orderInfo ?? `Nap vi ${amount} VND`;

    // Lưu transaction PENDING
    await paymentRepository.createPendingVNPayTopup(userId, amount, txnRef, description);

    // Tạo signed payment URL
    const paymentUrl = createVNPayPaymentUrl({
      amount,
      txnRef,
      orderInfo: description,
      ipAddr,
    });

    return { paymentUrl, txnRef };
  },

  /**
   * Bước 2a: Xử lý IPN (Instant Payment Notification) từ VNPay.
   * VNPay gọi endpoint này server-to-server sau khi user thanh toán.
   * Đây là cơ chế chính để cập nhật DB — không phụ thuộc vào return URL.
   *
   * Response phải đúng format VNPay yêu cầu:
   * { RspCode: "00", Message: "Confirm Success" }
   */
  handleVNPayIPN: async (query: Record<string, string>) => {
    // 1. Xác minh chữ ký
    const isValid = verifyVNPaySignature(query);
    if (!isValid) {
      return { RspCode: "97", Message: "Invalid Checksum" };
    }

    const { vnp_TxnRef, vnp_ResponseCode, vnp_Amount, vnp_TransactionStatus } = query;

    // 2. Tìm transaction trong DB
    const txn = await paymentRepository.findByVNPayTxnRef(vnp_TxnRef);
    if (!txn) {
      return { RspCode: "01", Message: "Order Not Found" };
    }

    // 3. Kiểm tra idempotency (đã xử lý rồi)
    if (txn.status !== "PENDING") {
      return { RspCode: "02", Message: "Order Already Confirmed" };
    }

    // 4. Kiểm tra số tiền khớp (VNPay trả về đã * 100)
    const vnpAmountVND = parseInt(vnp_Amount) / 100;
    if (vnpAmountVND !== txn.amount) {
      return { RspCode: "04", Message: "Invalid Amount" };
    }

    // 5. Xử lý kết quả thanh toán
    const isSuccess = vnp_ResponseCode === "00" && vnp_TransactionStatus === "00";

    if (isSuccess) {
      await paymentRepository.confirmVNPayTopup(txn.id, txn.userId, txn.amount);
      return { RspCode: "00", Message: "Confirm Success" };
    } else {
      await paymentRepository.failVNPayTopup(txn.id);
      return { RspCode: "00", Message: "Confirm Success" }; // VNPay vẫn yêu cầu "00" để xác nhận đã nhận được
    }
  },

  /**
   * Bước 2b: Xử lý Return URL (user được redirect về sau thanh toán).
   * Chỉ dùng để hiển thị kết quả cho FE, KHÔNG cập nhật DB ở đây.
   */
  handleVNPayReturn: async (query: Record<string, string>) => {
    const isValid = verifyVNPaySignature(query);
    if (!isValid) {
      throw new BadRequestError("Chữ ký không hợp lệ");
    }

    const { vnp_TxnRef, vnp_ResponseCode, vnp_Amount } = query;

    const success = vnp_ResponseCode === "00";
    const amount = parseInt(vnp_Amount ?? "0") / 100;

    return {
      success,
      txnRef: vnp_TxnRef,
      amount,
      message: success ? "Thanh toán thành công" : "Thanh toán thất bại",
      responseCode: vnp_ResponseCode,
    };
  },
};
