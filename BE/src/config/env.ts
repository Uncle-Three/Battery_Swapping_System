import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production"]).default("development"),
  PORT: z.coerce.number().default(5000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET must be at least 32 characters"),
  JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET must be at least 32 characters"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
  CLIENT_URL: z.string().default("http://localhost:5173"),
  BCRYPT_SALT_ROUNDS: z.coerce.number().default(12),
  LOG_LEVEL: z.string().default("debug"),
  // VNPay
  VNPAY_TMN_CODE: z.string().min(1, "VNPAY_TMN_CODE is required"),
  VNPAY_HASH_SECRET: z.string().min(1, "VNPAY_HASH_SECRET is required"),
  VNPAY_URL: z.string().url().default("https://sandbox.vnpayment.vn/paymentv2/vpcpay.html"),
  VNPAY_RETURN_URL: z.string().url(),
});

export const env = envSchema.parse(process.env);
