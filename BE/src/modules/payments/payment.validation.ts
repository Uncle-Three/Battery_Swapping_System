import { z } from "zod";

export const createTopupSchema = z.object({
  amount: z.coerce.number().min(10000),
  paymentMethod: z.string().min(1),
});

export const purchaseSubscriptionSchema = z.object({
  packageId: z.string().min(1),
});

// VNPay top-up request
export const createVNPayTopupSchema = z.object({
  amount: z.coerce
    .number()
    .min(10000, "Số tiền tối thiểu là 10,000 VNĐ")
    .max(500_000_000, "Số tiền tối đa là 500,000,000 VNĐ"),
  orderInfo: z.string().optional(),
});

// VNPay return/IPN query params (tất cả là string từ query)
export const vnpayCallbackSchema = z.object({
  vnp_TxnRef: z.string(),
  vnp_ResponseCode: z.string(),
  vnp_TransactionStatus: z.string(),
  vnp_Amount: z.string(),
  vnp_SecureHash: z.string(),
}).passthrough();
