import type { z } from "zod";
<<<<<<< HEAD
import type { googleLoginSchema, loginSchema, registerSchema, resendVerificationSchema, verifyEmailSchema } from "./auth.validation";
=======
import type { googleLoginSchema, loginSchema, registerSchema } from "./auth.validation";
>>>>>>> c1e66c0b73c4c02a2d09fc6d7459f123759cc74f

export type LoginInput = z.infer<typeof loginSchema>;
export type GoogleLoginInput = z.infer<typeof googleLoginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
<<<<<<< HEAD
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;
=======
>>>>>>> c1e66c0b73c4c02a2d09fc6d7459f123759cc74f
