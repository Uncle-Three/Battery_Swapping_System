import { paymentRepository } from "./payment.repository";
import { createVNPayPaymentUrl, verifyVNPaySignature } from "../../common/utils/vnpay";
import { BadRequestError } from "../../common/errors/bad-request-error";
import { prisma } from "../../config/database";
import { emailService } from "../email/email.service";

export const paymentService = {
  // ── Wallet ────────────────────────────────────────────────────────────────

  getWallet: async (userId: string) => {
    const wallet = await paymentRepository.findWalletByUserId(userId);
    return wallet ?? { userId, balance: 0 };
  },

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

    if (!txn.swapTransactionId) {
      return { RspCode: "01", Message: "Booking Payment Not Found" };
    }

    if (isSuccess) {
      const result = await paymentRepository.confirmVNPayBookingPayment(txn.id, txn.amount);
      if (result.completed) {
        // Lấy thông tin swap để gửi report
        const swap = await prisma.swapTransaction.findUnique({
          where: { id: txn.swapTransactionId },
          select: { id: true, stationId: true, userId: true },
        });
        if (swap) {
          await paymentRepository.notifyAdminAndManager(
            swap.id,
            txn.amount,
            "VNPay",
            swap.stationId,
            swap.userId,
          );
        }
        const completedSwap = await prisma.swapTransaction.findUnique({
          where: { id: txn.swapTransactionId },
          include: {
            user: { select: { fullName: true, email: true } },
            station: { select: { name: true } },
            booking: { include: { vehicle: { select: { name: true, plateNumber: true } } } },
            vehicle: { select: { name: true, plateNumber: true } },
            batteryIn: { select: { serialNumber: true } },
            batteryOut: { select: { serialNumber: true } },
            warrantyCard: true,
            inspection: true,
          },
        });
        if (completedSwap) {
          const vehicleName = completedSwap.booking?.vehicle?.name ?? completedSwap.vehicle?.name;
          const plateNumber = completedSwap.booking?.vehicle?.plateNumber ?? completedSwap.vehicle?.plateNumber;

<<<<<<< HEAD
=======
          // Email thay pin hoàn tất
          await emailService.sendSwapCompleted({
            customerName: completedSwap.user.fullName,
            customerEmail: completedSwap.user.email,
            stationName: completedSwap.station.name,
            vehicleName,
            plateNumber,
            oldBatterySerial: completedSwap.batteryIn?.serialNumber,
            newBatterySerial: completedSwap.batteryOut?.serialNumber,
            amount: txn.amount,
            completedAt: completedSwap.completedAt,
          });

>>>>>>> c1e66c0b73c4c02a2d09fc6d7459f123759cc74f
          // Email phiếu bảo hành 1 năm
          if (completedSwap.warrantyCard) {
            await emailService.sendWarrantyIssued({
              customerName: completedSwap.user.fullName,
              customerEmail: completedSwap.user.email,
              warrantyNumber: completedSwap.warrantyCard.warrantyNumber,
              issuedAt: completedSwap.warrantyCard.issuedAt,
              expiresAt: completedSwap.warrantyCard.expiresAt,
              newBatterySerial: completedSwap.batteryOut?.serialNumber,
              vehicleName,
              plateNumber,
              stationName: completedSwap.station.name,
            });
          }

          // Email báo cáo tổng hợp dịch vụ (Swap Summary Report)
          await emailService.sendSwapSummaryReport({
            customerName: completedSwap.user.fullName,
            customerEmail: completedSwap.user.email,
            swapId: completedSwap.id,
            stationName: completedSwap.station.name,
            vehicleName,
            plateNumber,
            oldBatterySerial: completedSwap.batteryIn?.serialNumber,
            oldBatterySoh: completedSwap.inspection?.soh,
            oldBatterySoc: completedSwap.batteryInSoc ?? completedSwap.inspection?.soc,
            oldBatteryCondition: completedSwap.inspection?.physicalCondition,
            oldBatteryOutcome: completedSwap.inspection?.outcome,
            newBatterySerial: completedSwap.batteryOut?.serialNumber,
            newBatterySoc: completedSwap.batteryOutSoc,
            warrantyNumber: completedSwap.warrantyCard?.warrantyNumber,
            warrantyExpiresAt: completedSwap.warrantyCard?.expiresAt,
            amount: txn.amount,
            paymentMethod: "VNPay",
            completedAt: completedSwap.completedAt,
          });
        }
      }
      return { RspCode: "00", Message: "Confirm Success" };

    } else {
      await paymentRepository.failVNPayTopup(txn.id);
      // Thông báo cho user biết thanh toán thất bại
      await prisma.notification.create({
        data: {
          userId: txn.userId,
          type: "PAYMENT_UPDATE",
          title: "Thanh toán thất bại",
          message: `Thanh toán ${txn.amount.toLocaleString("vi-VN")} VNĐ qua VNPay không thành công. Vui lòng thử lại.`,
          entityType: "PaymentTransaction",
          entityId: txn.id,
        },
      });
<<<<<<< HEAD
      const customer = await prisma.user.findUnique({
        where: { id: txn.userId },
        select: { fullName: true, email: true },
      });
      if (customer) {
        await emailService.sendPaymentFailed({
          customerName: customer.fullName,
          customerEmail: customer.email,
          amount: txn.amount,
          reason: "Giao dịch VNPay không thành công. Vui lòng thử lại.",
        });
      }
=======
>>>>>>> c1e66c0b73c4c02a2d09fc6d7459f123759cc74f
      return { RspCode: "00", Message: "Confirm Success" }; // VNPay vẫn yêu cầu "00" để xác nhận đã nhận được
    }
  },

  /**
   * Bước 2b: Xử lý Return URL (user được redirect về sau thanh toán).
   * Chỉ dùng để hiển thị kết quả cho FE, KHÔNG cập nhật DB ở đây.
   *
   * KHÔNG throw lỗi — trả về success: false để FE hiển thị trang kết quả.
   * (IPN mới là nơi strict verify, vì IPN là server-to-server và cập nhật DB)
   */
  handleVNPayReturn: async (query: Record<string, string>) => {
    const { vnp_TxnRef, vnp_ResponseCode, vnp_Amount, vnp_SecureHash } = query;

    // Không có params VNPay => trả về invalid
    if (!vnp_ResponseCode || !vnp_SecureHash) {
      return {
        success: false,
        txnRef: vnp_TxnRef ?? "",
        amount: 0,
        message: "Không có thông tin phản hồi từ VNPay",
        responseCode: vnp_ResponseCode ?? "MISSING",
        signatureValid: false,
      };
    }

    const signatureValid = verifyVNPaySignature(query);
    const success = vnp_ResponseCode === "00" && signatureValid;
    const amount = parseInt(vnp_Amount ?? "0") / 100;
    const bookingId = vnp_TxnRef ? await paymentRepository.findBookingIdByPayment(vnp_TxnRef) : null;

    return {
      success,
      txnRef: vnp_TxnRef ?? "",
      amount,
      message: !signatureValid
        ? "Chữ ký không hợp lệ — kết quả không được xác nhận"
        : success
          ? "Thanh toán thành công"
          : "Thanh toán thất bại",
      responseCode: vnp_ResponseCode,
      signatureValid,
      bookingId,
    };
  },

  // ── Booking Payment ────────────────────────────────────────────────────────

  /**
   * Lấy trạng thái thanh toán của booking (invoice + payments + wallet).
   * Dùng để hiển thị trên trang payment của member.
   */
  getBookingPaymentStatus: async (userId: string, bookingId: string) => {
    const data = await paymentRepository.findBookingPaymentStatus(userId, bookingId);
    if (!data) throw new BadRequestError("Booking không tồn tại hoặc không thuộc về bạn");
    return data;
  },

  /**
   * Khởi tạo VNPay payment cho booking cụ thể.
   * Amount lấy từ invoice đã được Staff tạo — không nhận từ FE.
   */
  initiateVNPayBookingPayment: async (userId: string, bookingId: string, ipAddr: string) => {
    const data = await paymentRepository.findBookingPaymentStatus(userId, bookingId);
    if (!data) throw new BadRequestError("Booking không tồn tại hoặc không thuộc về bạn");
    if (!data.swap) throw new BadRequestError("Swap chưa được xử lý, chưa thể thanh toán");
    if (!data.swap.invoice) throw new BadRequestError("Chưa có hóa đơn cho lần thay pin này");
    if (data.swap.invoice.status === "PAID") throw new BadRequestError("Invoice đã được thanh toán");
    if (data.swap.workflowStatus !== "PAYMENT_PENDING") throw new BadRequestError("Lần thay pin chưa sẵn sàng để thanh toán");

    const amount = data.swap.invoice.amount;
    const swapId = data.swap.id;
    const existingPending = data.swap.payments.find((payment) => payment.paymentMethod === "VNPAY" && payment.status === "PENDING");
    if (existingPending?.vnpTxnRef) {
      const paymentUrl = createVNPayPaymentUrl({ amount: existingPending.amount, txnRef: existingPending.vnpTxnRef, orderInfo: existingPending.description ?? `Thanh toan doi pin booking ${bookingId}`, ipAddr });
      return { paymentUrl, txnRef: existingPending.vnpTxnRef, amount: existingPending.amount };
    }
    const txnRef = Date.now().toString() + userId.replace(/-/g, "").slice(0, 6);
    const description = `Thanh toan doi pin booking ${bookingId}`;

    await paymentRepository.createPendingVNPayBookingPayment(userId, swapId, amount, txnRef, description);

    const paymentUrl = createVNPayPaymentUrl({ amount, txnRef, orderInfo: description, ipAddr });
    return { paymentUrl, txnRef, amount };
  },

  // ── Payment History ────────────────────────────────────────────────────────

  /**
   * User xem lịch sử giao dịch của chính mình (phân trang, lọc theo status/method/date).
   */
  getMyPaymentHistory: async (
    userId: string,
    query: { status?: string; method?: string; from?: string; to?: string; page?: number; limit?: number },
  ) => {
    return paymentRepository.findPaymentHistory(userId, {
      status: query.status,
      method: query.method,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
      page: query.page ?? 1,
      limit: Math.min(query.limit ?? 20, 100),
    });
  },

  /**
   * Admin xem tất cả, Manager chỉ xem theo station được assign.
   */
  getAllPaymentHistory: async (
    userId: string,
    role: string,
    query: { status?: string; method?: string; from?: string; to?: string; page?: number; limit?: number },
  ) => {
    // Admin thấy tất cả, Manager chỉ thấy station của mình
    let stationIds: string[] | undefined;
    if (role !== "ADMIN") {
      const assignments = await prisma.stationAssignment.findMany({
        where: { userId, assignmentRole: "MANAGER", active: true },
        select: { stationId: true },
      });
      stationIds = assignments.map((a) => a.stationId);
    }
    return paymentRepository.findAllPaymentHistory(stationIds, {
      status: query.status,
      method: query.method,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
      page: query.page ?? 1,
      limit: Math.min(query.limit ?? 20, 100),
    });
  },
};
