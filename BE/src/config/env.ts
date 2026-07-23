import dotenv from "dotenv";
import { z } from "zod";

// Use one canonical environment file for every runtime.
dotenv.config({ path: ".env" });

const databaseUrlForEnvironment = (databaseUrl?: string) => {
  if (!databaseUrl || process.env.NODE_ENV !== "test") return databaseUrl;
  return databaseUrl.replace(/\/([^/?]+)(\?.*)?$/, (_match, databaseName: string, query = "") =>
    `/${databaseName.endsWith("_test") ? databaseName : `${databaseName}_test`}${query}`,
  );
};

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
  // Google login
  GOOGLE_CLIENT_ID: z.string().default(""),
<<<<<<< HEAD
  // Gmail SMTP. Keep disabled locally until a Gmail App Password is configured.
  APP_MAIL_ENABLED: z.stringbool().default(true),
  APP_MAIL_LOG_MOCK_BODY: z.stringbool().default(false),
=======
  // Gmail SMTP. Empty values keep email sending disabled for local development.
>>>>>>> c1e66c0b73c4c02a2d09fc6d7459f123759cc74f
  MAIL_HOST: z.string().default("smtp.gmail.com"),
  MAIL_PORT: z.coerce.number().int().positive().default(587),
  MAIL_SECURE: z.stringbool().default(false),
  MAIL_USER: z.string().default(""),
  MAIL_PASS: z.string().default(""),
  MAIL_FROM: z.string().default("Battery Swapping System <no-reply@example.com>"),
<<<<<<< HEAD
  EMAIL_VERIFICATION_EXPIRES_MINUTES: z.coerce.number().int().min(5).max(60).default(10),
=======
>>>>>>> c1e66c0b73c4c02a2d09fc6d7459f123759cc74f
});

const gmailUsername = process.env.GMAIL_USERNAME?.trim();
const mailPassword = (process.env.MAIL_PASS || process.env.GMAIL_APP_PASSWORD)
  ?.replace(/\s/g, "")
  .trim();

// Accept both generic MAIL_* names and the GMAIL_* names used by deployment
// environments. Generic names take precedence when both are present.
export const env = envSchema.parse({
  ...process.env,
  DATABASE_URL: databaseUrlForEnvironment(process.env.DATABASE_URL),
  APP_MAIL_ENABLED: process.env.NODE_ENV === "test" ? "false" : process.env.APP_MAIL_ENABLED,
  MAIL_USER: process.env.MAIL_USER || gmailUsername,
  MAIL_PASS: mailPassword,
  MAIL_FROM: process.env.MAIL_FROM || (gmailUsername ? `Battery Swapping System <${gmailUsername}>` : undefined),
});
