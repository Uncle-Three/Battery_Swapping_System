import {
  BatteryOperationalStatus, BookingStatus, InvoiceStatus, NotificationType,
  PaymentMethod, PaymentStatus, ReplacementRequestStatus, ReservationStatus, SwapStatus,
} from "@prisma/client";
import { prisma } from "../../config/database";
import { Roles } from "../../constants/roles";

export const paymentRepository = {
  // ── Wallet ────────────────────────────────────────────────────────────────

  /** Tìm ví của user, trả về null nếu chưa có */
  findWalletByUserId: async (userId: string) => {
    return prisma.wallet.findUnique({ where: { userId } });
  },

  /** Lấy ví, tạo mới nếu chưa có */
  upsertWallet: async (userId: string) => {
    return prisma.wallet.upsert({
      where: { userId },
      update: {},
      create: { userId, balance: 0 },
    });
  },

  // ── PaymentTransaction ────────────────────────────────────────────────────

  /** Tạo PaymentTransaction PENDING cho VNPay top-up */
  createPendingVNPayTopup: async (
    userId: string,
    amount: number,
    txnRef: string,
    description: string
  ) => {
    return prisma.paymentTransaction.create({
      data: {
        userId,
        amount,
        paymentMethod: PaymentMethod.VNPAY,
        status: PaymentStatus.PENDING,
        description,
        vnpTxnRef: txnRef,
      },
    });
  },

  /** Tìm PaymentTransaction theo vnpTxnRef */
  findByVNPayTxnRef: async (txnRef: string) => {
    return prisma.paymentTransaction.findFirst({
      where: { vnpTxnRef: txnRef },
    });
  },

  /**
   * Xác nhận top-up thành công:
   * - Update PaymentTransaction → SUCCESS
   * - Cộng balance vào Wallet
   * Dùng Prisma transaction để đảm bảo atomic.
   */
  confirmVNPayTopup: async (txnId: string, userId: string, amount: number) => {
    return prisma.$transaction(async (tx) => {
      const claimed = await tx.paymentTransaction.updateMany({
        where: { id: txnId, status: PaymentStatus.PENDING },
        data: { status: PaymentStatus.SUCCESS },
      });
      if (claimed.count !== 1) return { credited: false };

      await tx.wallet.upsert({
        where: { userId },
        update: { balance: { increment: amount } },
        create: { userId, balance: amount },
      });
      return { credited: true };
    });
  },

  /** Đánh dấu PaymentTransaction thất bại */
  failVNPayTopup: async (txnId: string) => {
    return prisma.paymentTransaction.update({
      where: { id: txnId },
      data: { status: PaymentStatus.FAILED },
    });
  },

  // ── Booking Payment ───────────────────────────────────────────────────────

  /** Lấy invoice liên kết với swap */
  findInvoiceBySwapId: async (swapId: string) => {
    return prisma.invoice.findFirst({ where: { transactionId: swapId } });
  },

  /** Lấy thông tin payment status của booking (invoice + payment transactions) */
  findBookingPaymentStatus: async (userId: string, bookingId: string) => {
    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, userId },
      select: { id: true, status: true, costEstimate: true, stationId: true },
    });
    if (!booking) return null;
    const swap = await prisma.swapTransaction.findFirst({
      where: { bookingId },
      include: {
        invoice: true,
        payments: { orderBy: { createdAt: "desc" } },
      },
    });
    return { booking, swap };
  },

  /** Tạo PaymentTransaction PENDING cho VNPay booking payment */
  createPendingVNPayBookingPayment: async (
    userId: string,
    swapId: string,
    amount: number,
    txnRef: string,
    description: string,
  ) => {
    return prisma.paymentTransaction.create({
      data: {
        userId,
        swapTransactionId: swapId,
        amount,
        paymentMethod: PaymentMethod.VNPAY,
        status: PaymentStatus.PENDING,
        description,
        vnpTxnRef: txnRef,
      },
    });
  },

  /** Confirm a booking payment and finalize the battery replacement atomically. */
  confirmVNPayBookingPayment: async (txnId: string, amount: number) => {
    return prisma.$transaction(async (tx) => {
      const transaction = await tx.paymentTransaction.findUnique({ where: { id: txnId } });
      if (!transaction?.swapTransactionId || transaction.status !== PaymentStatus.PENDING) return { completed: false };

      const swap = await tx.swapTransaction.findUnique({
        where: { id: transaction.swapTransactionId },
        include: { booking: true, batteryIn: true, batteryOut: true, inspection: true },
      });
      if (!swap?.booking || !swap.vehicleId || !swap.batteryOutId || !swap.batteryOut || !swap.staffId) {
        throw new Error("Swap is missing data required for payment completion");
      }
      if (swap.workflowStatus !== SwapStatus.PAYMENT_PENDING) return { completed: false };

      const claimed = await tx.paymentTransaction.updateMany({
        where: { id: txnId, status: PaymentStatus.PENDING },
        data: { status: PaymentStatus.SUCCESS },
      });
      if (claimed.count !== 1) return { completed: false };

      await tx.invoice.update({ where: { transactionId: swap.id }, data: { amount, paymentMethod: PaymentMethod.VNPAY, status: InvoiceStatus.PAID } });
      await tx.vehicleBatteryAssignment.create({ data: { vehicleId: swap.vehicleId, batteryId: swap.batteryOutId, assignedById: swap.staffId, active: true } });
      await tx.battery.update({ where: { id: swap.batteryOutId }, data: { operationalStatus: BatteryOperationalStatus.INSTALLED, slotId: null, stationId: null } });
      await tx.batteryReservation.updateMany({ where: { bookingId: swap.booking.id, status: ReservationStatus.ACTIVE }, data: { status: ReservationStatus.CONSUMED } });
      await tx.booking.update({ where: { id: swap.booking.id }, data: { status: BookingStatus.COMPLETED } });
      await tx.bayReservation.updateMany({ where: { bookingId: swap.booking.id, status: ReservationStatus.ACTIVE }, data: { status: ReservationStatus.CONSUMED } });
      await tx.vehicle.update({ where: { id: swap.vehicleId }, data: { status: "ACTIVE" } });
      if (swap.booking.replacementRequestId) {
        await tx.replacementRequest.updateMany({
          where: { id: swap.booking.replacementRequestId, status: { notIn: [ReplacementRequestStatus.COMPLETED, ReplacementRequestStatus.CANCELLED] } },
          data: { status: ReplacementRequestStatus.COMPLETED },
        });
      }
      await tx.batteryLifecycleEvent.create({ data: { batteryId: swap.batteryOutId, actorId: swap.staffId, eventType: "INSTALLED_TO_VEHICLE", fromStatus: BatteryOperationalStatus.RESERVED, toStatus: BatteryOperationalStatus.INSTALLED, safetyState: swap.batteryOut.safetyState, snapshot: { swapTransactionId: swap.id, vehicleId: swap.vehicleId } } });
      if (swap.batteryInId && swap.batteryIn) {
        await tx.batteryLifecycleEvent.create({ data: { batteryId: swap.batteryInId, actorId: swap.staffId, eventType: "REMOVED_AND_INSPECTED", fromStatus: BatteryOperationalStatus.INSTALLED, toStatus: swap.batteryIn.operationalStatus, safetyState: swap.batteryIn.safetyState, snapshot: { swapTransactionId: swap.id, inspectionId: swap.inspection?.id } } });
      }
      await tx.notification.create({ data: { userId: swap.userId, type: NotificationType.PAYMENT_UPDATE, title: "Đổi pin hoàn tất", message: `Thanh toán trực tiếp ${amount.toLocaleString("vi-VN")} VND qua VNPay thành công.`, entityType: "SwapTransaction", entityId: swap.id } });
      await tx.swapStepHistory.create({ data: { swapTransactionId: swap.id, actorId: swap.staffId, fromStatus: SwapStatus.PAYMENT_PENDING, toStatus: SwapStatus.COMPLETED, data: { paymentMethod: "VNPAY", amount } } });
      await tx.swapTransaction.update({ where: { id: swap.id }, data: { workflowStatus: SwapStatus.COMPLETED, completedAt: new Date(), status: "SUCCESS" } });

      // ── Tạo phiếu bảo hành 1 năm ──────────────────────────────────────────
      const now = new Date();
      const issuedAt = now;
      const expiresAt = new Date(now);
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      const datePart = now.toISOString().slice(0, 10).replace(/-/g, ""); // "20260714"
      const warrantyNumber = `WR-${datePart}-${swap.id.slice(-5).toUpperCase()}`;
      const warrantyCard = await tx.warrantyCard.create({
        data: {
          swapTransactionId: swap.id,
          userId: swap.userId,
          batteryId: swap.batteryOutId,
          vehicleId: swap.vehicleId,
          stationId: swap.stationId,
          warrantyNumber,
          issuedAt,
          expiresAt,
        },
      });
      await tx.notification.create({
        data: {
          userId: swap.userId,
          type: NotificationType.SYSTEM,
          title: "Phiếu bảo hành đã được cấp",
          message: `Bảo hành pin ${warrantyNumber} có hiệu lực đến ${expiresAt.toLocaleDateString("vi-VN")}. Kiểm tra email của bạn để xem chi tiết.`,
          entityType: "WarrantyCard",
          entityId: warrantyCard.id,
        },
      });

      return { completed: true, bookingId: swap.booking.id, warrantyCard };
    });
  },


  findBookingIdByPayment: async (txnRef: string) => {
    const transaction = await prisma.paymentTransaction.findFirst({
      where: { vnpTxnRef: txnRef },
      select: { swapTransaction: { select: { bookingId: true } } },
    });
    return transaction?.swapTransaction?.bookingId ?? null;
  },

  // ── Notifications ─────────────────────────────────────────────────────────

  /**
   * Gửi in-app notification cho tất cả Admin và Manager của station liên quan.
   * Được gọi sau khi VNPay IPN xác nhận thanh toán thành công.
   */
  notifyAdminAndManager: async (
    swapId: string,
    amount: number,
    paymentMethod: string,
    stationId: string,
    userId: string,
  ) => {
    // Tìm tất cả Admin
    const admins = await prisma.user.findMany({
      where: { role: { name: Roles.ADMIN as any }, status: "ACTIVE" },
      select: { id: true },
    });

    // Tìm Manager được assign cho station này
    const managers = await prisma.stationAssignment.findMany({
      where: { stationId, assignmentRole: "MANAGER", active: true },
      select: { userId: true },
    });

    const recipientIds = [
      ...admins.map((a) => a.id),
      ...managers.map((m) => m.userId),
    ];

    // Dedup (tránh gửi 2 lần nếu Admin cũng là Manager)
    const uniqueIds = [...new Set(recipientIds)].filter((id) => id !== userId);

    if (uniqueIds.length === 0) return;

    const amountFormatted = amount.toLocaleString("vi-VN");
    await prisma.notification.createMany({
      data: uniqueIds.map((recipientId) => ({
        userId: recipientId,
        type: NotificationType.PAYMENT_UPDATE,
        title: "Báo cáo giao dịch thay pin",
        message: `Giao dịch thay pin #${swapId.slice(-6).toUpperCase()} vừa hoàn tất. Số tiền: ${amountFormatted} VNĐ qua ${paymentMethod}.`,
        entityType: "SwapTransaction",
        entityId: swapId,
      })),
    });
  },

  // ── Payment History ────────────────────────────────────────────────────────

  /** Lấy lịch sử thanh toán của 1 user (phân trang) */
  findPaymentHistory: async (
    userId: string,
    filters: {
      status?: string;
      method?: string;
      from?: Date;
      to?: Date;
      page: number;
      limit: number;
    },
  ) => {
    const where: any = { userId };
    if (filters.status) where.status = filters.status;
    if (filters.method) where.paymentMethod = filters.method;
    if (filters.from || filters.to) {
      where.createdAt = {};
      if (filters.from) where.createdAt.gte = filters.from;
      if (filters.to) where.createdAt.lte = filters.to;
    }

    const [items, total] = await Promise.all([
      prisma.paymentTransaction.findMany({
        where,
        include: {
          swapTransaction: {
            select: {
              id: true,
              workflowStatus: true,
              completedAt: true,
              station: { select: { id: true, name: true, address: true } },
              batteryOut: { select: { batteryCode: true, serialNumber: true } },
              batteryIn: { select: { batteryCode: true, serialNumber: true } },
              booking: { select: { id: true, scheduledStart: true, vehicleName: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      prisma.paymentTransaction.count({ where }),
    ]);

    return { items, total, page: filters.page, limit: filters.limit, totalPages: Math.ceil(total / filters.limit) };
  },

  /** Lấy lịch sử thanh toán toàn hệ thống (Admin) hoặc theo station (Manager) */
  findAllPaymentHistory: async (
    stationIds: string[] | undefined,
    filters: {
      status?: string;
      method?: string;
      from?: Date;
      to?: Date;
      page: number;
      limit: number;
    },
  ) => {
    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.method) where.paymentMethod = filters.method;
    if (filters.from || filters.to) {
      where.createdAt = {};
      if (filters.from) where.createdAt.gte = filters.from;
      if (filters.to) where.createdAt.lte = filters.to;
    }
    if (stationIds) {
      where.swapTransaction = { stationId: { in: stationIds } };
    }

    const [items, total] = await Promise.all([
      prisma.paymentTransaction.findMany({
        where,
        include: {
          user: { select: { id: true, fullName: true, email: true, phone: true } },
          swapTransaction: {
            select: {
              id: true,
              workflowStatus: true,
              completedAt: true,
              station: { select: { id: true, name: true, address: true } },
              batteryOut: { select: { batteryCode: true, serialNumber: true } },
              batteryIn: { select: { batteryCode: true, serialNumber: true } },
              booking: { select: { id: true, scheduledStart: true, vehicleName: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      prisma.paymentTransaction.count({ where }),
    ]);

    return { items, total, page: filters.page, limit: filters.limit, totalPages: Math.ceil(total / filters.limit) };
  },

};
