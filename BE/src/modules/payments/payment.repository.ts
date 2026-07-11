import { PrismaClient, PaymentMethod, PaymentStatus } from "@prisma/client";

const prisma = new PrismaClient();

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
    return prisma.paymentTransaction.findUnique({
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
    return prisma.$transaction([
      prisma.paymentTransaction.update({
        where: { id: txnId },
        data: { status: PaymentStatus.SUCCESS },
      }),
      prisma.wallet.upsert({
        where: { userId },
        update: { balance: { increment: amount } },
        create: { userId, balance: amount },
      }),
    ]);
  },

  /** Đánh dấu PaymentTransaction thất bại */
  failVNPayTopup: async (txnId: string) => {
    return prisma.paymentTransaction.update({
      where: { id: txnId },
      data: { status: PaymentStatus.FAILED },
    });
  },

  // ── Legacy stubs (giữ tương thích code cũ) ───────────────────────────────

  createTopup: async (userId: string, input: unknown) => ({ userId, input }),
  purchaseSubscription: async (userId: string, input: unknown) => ({ userId, input }),
};
