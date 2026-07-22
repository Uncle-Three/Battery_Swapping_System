import { z } from "zod";

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email format").toLowerCase().trim(),
  }),
});

export const verifyResetOtpSchema = z.object({
  body: z.object({
    email: z.string().email().toLowerCase().trim(),
    otp: z.string().min(1, "Token or OTP is required"),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    email: z.string().email().toLowerCase().trim(),
    otp: z.string().min(1, "Token or OTP is required"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(72, "Password too long"),
  }),
});

export const requestPhoneChangeSchema = z.object({
  body: z.object({
    newPhone: z
      .string()
      .min(9, "Phone number too short")
      .max(15, "Phone number too long")
      .regex(/^\+?[\d\s\-().]+$/, "Invalid phone number format")
      .trim(),
  }),
});

export const verifyPhoneChangeSchema = z.object({
  body: z.object({
    otp: z.string().length(6).regex(/^\d{6}$/, "OTP must be 6 numeric digits"),
  }),
});

export const manualRecoverySchema = z.object({
  body: z.object({
    contactEmail: z.string().email("Invalid contact email"),
    contactPhone: z.string().optional(),
    description: z.string().min(20, "Description must be at least 20 characters").max(2000),
    documentUrls: z.array(z.string().url()).max(10, "Maximum 10 documents").optional().default([]),
  }),
});

export const adminReviewRecoverySchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    adminNotes: z.string().max(2000).optional(),
    rejectionReason: z.string().max(1000).optional(),
    resolvedAction: z.string().max(500).optional(),
  }),
});

export const listRecoveryRequestsSchema = z.object({
  query: z.object({
    status: z.enum(["PENDING", "UNDER_REVIEW", "APPROVED", "REJECTED"]).optional(),
    page: z.coerce.number().int().min(0).default(0),
    size: z.coerce.number().int().min(1).max(100).default(20),
  }),
});
