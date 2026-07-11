import crypto from "crypto";
import { env } from "../../config/env";

/**
 * Tạo VNPay payment URL theo chuẩn VNPay v2.
 * Tham khảo: https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.md
 */
export interface CreateVNPayUrlParams {
  amount: number;       // Số tiền (VNĐ, chưa nhân 100)
  txnRef: string;       // Mã giao dịch duy nhất
  orderInfo: string;    // Mô tả đơn hàng
  ipAddr: string;       // IP của người dùng
  locale?: string;      // "vn" | "en"
}

export function createVNPayPaymentUrl(params: CreateVNPayUrlParams): string {
  const { amount, txnRef, orderInfo, ipAddr, locale = "vn" } = params;

  const now = new Date();
  const createDate = formatVNPayDate(now);
  const expireDate = formatVNPayDate(new Date(now.getTime() + 15 * 60 * 1000)); // +15 phút

  const vnpParams: Record<string, string> = {
    vnp_Version: "2.1.0",
    vnp_Command: "pay",
    vnp_TmnCode: env.VNPAY_TMN_CODE,
    vnp_Amount: String(amount * 100),         // VNPay yêu cầu * 100
    vnp_CreateDate: createDate,
    vnp_CurrCode: "VND",
    vnp_IpAddr: ipAddr,
    vnp_Locale: locale,
    vnp_OrderInfo: orderInfo,
    vnp_OrderType: "other",
    vnp_ReturnUrl: env.VNPAY_RETURN_URL,
    vnp_TxnRef: txnRef,
    vnp_ExpireDate: expireDate,
  };

  // Sắp xếp tham số theo alphabet (bắt buộc theo VNPay spec)
  const sortedParams = Object.keys(vnpParams)
    .sort()
    .reduce<Record<string, string>>((acc, key) => {
      acc[key] = vnpParams[key];
      return acc;
    }, {});

  const signData = new URLSearchParams(sortedParams).toString();
  const secureHash = hmacSHA512(env.VNPAY_HASH_SECRET, signData);

  const paymentUrl =
    env.VNPAY_URL + "?" + signData + "&vnp_SecureHash=" + secureHash;

  return paymentUrl;
}

/**
 * Xác minh chữ ký HMAC-SHA512 từ VNPay callback (IPN hoặc Return URL).
 * Trả về true nếu hợp lệ.
 */
export function verifyVNPaySignature(query: Record<string, string>): boolean {
  const { vnp_SecureHash, ...rest } = query;

  if (!vnp_SecureHash) return false;

  // Loại bỏ vnp_SecureHashType nếu có
  delete rest["vnp_SecureHashType"];

  const sortedParams = Object.keys(rest)
    .sort()
    .reduce<Record<string, string>>((acc, key) => {
      acc[key] = rest[key];
      return acc;
    }, {});

  const signData = new URLSearchParams(sortedParams).toString();
  const expectedHash = hmacSHA512(env.VNPAY_HASH_SECRET, signData);

  return expectedHash === vnp_SecureHash.toLowerCase();
}

/**
 * Format ngày theo chuẩn VNPay: YYYYMMDDHHmmss
 */
function formatVNPayDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    date.getFullYear().toString() +
    pad(date.getMonth() + 1) +
    pad(date.getDate()) +
    pad(date.getHours()) +
    pad(date.getMinutes()) +
    pad(date.getSeconds())
  );
}

/**
 * Tạo HMAC-SHA512 hash
 */
function hmacSHA512(secret: string, data: string): string {
  return crypto.createHmac("sha512", secret).update(data).digest("hex");
}
