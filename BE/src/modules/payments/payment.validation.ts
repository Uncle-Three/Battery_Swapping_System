import { z } from "zod";

export const createTopupSchema = z.object({
  amount: z.coerce.number().int().positive().min(10000),
  paymentMethod: z.string().min(1),
});

export const purchaseSubscriptionSchema = z.object({
  packageId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid MongoDB ObjectId"),
});

// VNPay top-up request
export const createVNPayTopupSchema = z.object({
  amount: z.coerce
    .number()
    .int()
    .positive()
    .min(10000, "Số tiền tối thiểu là 10,000 VNĐ")
    .max(500_000_000, "Số tiền tối đa là 500,000,000 VNĐ"),
  orderInfo: z.string().optional(),
});

// VNPay return/IPN query params
// vnp_TransactionStatus là optional vì VNPay không luôn gửi field này
// (ví dụ: user hủy trước khi hoàn tất thanh toán)
export const vnpayCallbackSchema = z.object({
  vnp_TxnRef: z.string().optional(),
  vnp_ResponseCode: z.string().optional(),
  vnp_TransactionStatus: z.string().optional(),
  vnp_Amount: z.string().optional(),
  vnp_SecureHash: z.string().optional(),
}).passthrough();

// Payment history query params
export const paymentHistoryQuerySchema = z.object({
  status: z.enum(["PENDING", "PROCESSING", "SUCCESS", "FAILED", "CANCELLED", "REFUNDED"]).optional(),
  method: z.enum(["MOMO", "VNPAY", "CARD", "WALLET", "CASH"]).optional(),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
