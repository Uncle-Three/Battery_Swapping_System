import rateLimit from "express-rate-limit";
import { env } from "../../config/env";

const authRateLimitMessage = {
  success: false,
  code: "RATE_LIMITED",
  message: "Too many requests. Please try again later.",
  errors: [],
};

const skipInAutomatedTests = () => env.NODE_ENV === "test" || process.env.E2E_TEST === "true";

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: authRateLimitMessage,
  skip: skipInAutomatedTests,
});

export const registerRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: authRateLimitMessage,
  skip: skipInAutomatedTests,
});

export const refreshRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: authRateLimitMessage,
  skip: skipInAutomatedTests,
});
