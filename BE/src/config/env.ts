import dotenv from "dotenv";
import { z } from "zod";

// Load .env.{NODE_ENV} nếu có, fallback về .env
const envFile = process.env.NODE_ENV === "test" ? ".env.test" : ".env";
dotenv.config({ path: envFile });
// Fallback: load .env nếu .env.test không tồn tại (dotenv bỏ qua file không tìm thấy)
if (process.env.NODE_ENV === "test") dotenv.config({ override: false });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(5000),
  DATABASE_URL: z.string().regex(/^mongodb(\+srv)?:\/\//, "DATABASE_URL must be a MongoDB URL"),
  JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET must be at least 32 characters"),
  JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET must be at least 32 characters"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
  CLIENT_URL: z.string().default("http://localhost:5173"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  SWAGGER_ENABLED: z.stringbool().default(true),
  SWAGGER_SERVER_URL: z.string().url().default("http://localhost:5000"),
  BCRYPT_SALT_ROUNDS: z.coerce.number().default(12),
  LOG_LEVEL: z.string().default("debug"),
  API_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
  API_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(1000),
  // VNPay
  VNPAY_TMN_CODE: z.string().min(1, "VNPAY_TMN_CODE is required"),
  VNPAY_HASH_SECRET: z.string().min(1, "VNPAY_HASH_SECRET is required"),
  VNPAY_URL: z.string().url().default("https://sandbox.vnpayment.vn/paymentv2/vpcpay.html"),
  VNPAY_RETURN_URL: z.string().url(),
});

export const env = envSchema.parse(process.env);
