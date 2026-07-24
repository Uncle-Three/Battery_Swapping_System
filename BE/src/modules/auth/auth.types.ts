import type { z } from "zod";
import type { googleLoginSchema, loginSchema, registerSchema, resendVerificationSchema, verifyEmailSchema } from "./auth.validation";

export type LoginInput = z.infer<typeof loginSchema>;
export type GoogleLoginInput = z.infer<typeof googleLoginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;
