import { z } from "zod";

export const loginSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(6),
});

export const registerSchema = z
  .object({
    email: z.email().trim().toLowerCase(),
    password: z.string().min(6),
    name: z.string().trim().min(1),
    phone: z.string().trim().min(1).optional(),
    avatarUrl: z.url().optional(),
  })
  .strict();
