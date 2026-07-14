import type { z } from "zod";
import type { googleLoginSchema, loginSchema, registerSchema } from "./auth.validation";

export type LoginInput = z.infer<typeof loginSchema>;
export type GoogleLoginInput = z.infer<typeof googleLoginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
