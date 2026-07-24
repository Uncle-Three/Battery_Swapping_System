import { z } from "zod";

export const loginSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(6),
});

export const googleLoginSchema = z
  .object({
    idToken: z.string().trim().min(10),
  })
  .strict();

export const registerSchema = z
  .object({
    email: z.email().trim().toLowerCase(),
    password: z.string().min(6),
    name: z.string().trim().min(1),
    phone: z.string().trim().regex(/^0\d{0,9}$/, "Phone number must start with 0 and contain at most 10 digits").optional(),
    avatarUrl: z.url().optional(),
  })
  .strict();

export const verifyEmailSchema = z.object({
  token: z.string().trim().min(32).max(256),
}).strict();

export const resendVerificationSchema = z.object({
  email: z.email().trim().toLowerCase(),
}).strict();
