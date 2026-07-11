import type { z } from "zod";
import type { loginSchema, registerSchema } from "./auth.validation";

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

