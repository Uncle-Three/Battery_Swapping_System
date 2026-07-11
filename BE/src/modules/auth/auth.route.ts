import { Router } from "express";
import { authController } from "./auth.controller";
import { authenticate } from "../../common/middleware/authenticate.middleware";
import { validate } from "../../common/middleware/validate.middleware";
import { loginRateLimiter, refreshRateLimiter, registerRateLimiter } from "../../common/middleware/rate-limit.middleware";
import { loginSchema, registerSchema } from "./auth.validation";

export const authRouter = Router();

authRouter.post("/login", loginRateLimiter, validate({ body: loginSchema }), authController.login);
authRouter.post("/register", registerRateLimiter, validate({ body: registerSchema }), authController.register);
authRouter.post("/refresh", refreshRateLimiter, authController.refresh);
authRouter.post("/logout", refreshRateLimiter, authController.logout);
authRouter.get("/profile", authenticate, authController.getProfile);
