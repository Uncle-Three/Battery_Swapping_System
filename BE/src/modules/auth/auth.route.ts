import { Router } from "express";
import { authController } from "./auth.controller";
import { authenticate } from "../../common/middleware/authenticate.middleware";
import { validate } from "../../common/middleware/validate.middleware";
import { emailVerificationRateLimiter, loginRateLimiter, refreshRateLimiter, registerRateLimiter } from "../../common/middleware/rate-limit.middleware";
import { googleLoginSchema, loginSchema, registerSchema, resendVerificationSchema, verifyEmailSchema } from "./auth.validation";

export const authRouter = Router();

authRouter.post("/login", loginRateLimiter, validate({ body: loginSchema }), authController.login);
authRouter.post("/google", loginRateLimiter, validate({ body: googleLoginSchema }), authController.googleLogin);
authRouter.post("/register", registerRateLimiter, validate({ body: registerSchema }), authController.register);
authRouter.post("/verify-email", emailVerificationRateLimiter, validate({ body: verifyEmailSchema }), authController.verifyEmail);
authRouter.post("/resend-verification", emailVerificationRateLimiter, validate({ body: resendVerificationSchema }), authController.resendVerification);
authRouter.post("/refresh", refreshRateLimiter, authController.refresh);
authRouter.post("/logout", refreshRateLimiter, authController.logout);
authRouter.get("/profile", authenticate, authController.getProfile);
