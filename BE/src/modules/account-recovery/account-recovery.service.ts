import { randomInt, randomBytes } from "node:crypto";
import { accountRecoveryRepository as repo } from "./account-recovery.repository";
import { hashPassword } from "../../common/utils/password";
import { AppError } from "../../common/errors/app-error";
import { NotFoundError } from "../../common/errors/not-found-error";
import { BadRequestError } from "../../common/errors/bad-request-error";
import { env } from "../../config/env";
import { emailService } from "../email/email.service";
import { prisma } from "../../config/database";
import type {
  ForgotPasswordInput,
  VerifyResetOtpInput,
  ResetPasswordInput,
  RequestPhoneChangeInput,
  VerifyPhoneChangeInput,
  ManualRecoveryInput,
} from "./account-recovery.types";

const OTP_EXPIRES_MINUTES = 1;
const MAX_OTP_ATTEMPTS = 5;

const generateOtp = (): string => String(randomInt(100000, 999999)).padStart(6, "0");

export const accountRecoveryService = {
  // ─── Forgot Password ────────────────────────────────────────────────────────

  requestPasswordReset: async (input: ForgotPasswordInput) => {
    const user = await repo.findUserByEmail(input.email);
    // Always respond with success to prevent email enumeration
    if (!user || user.status !== "ACTIVE") {
      return { message: "If this email exists, a password reset link has been sent to your email." };
    }

    const token = randomBytes(32).toString("hex");
    const tokenHash = repo.hashOtp(token);
    const expiresAt = new Date(Date.now() + OTP_EXPIRES_MINUTES * 60_000);

    // Invalidate any existing tokens first
    await repo.invalidateAllPasswordResetTokens(user.id);
    await repo.createPasswordResetToken(user.id, tokenHash, expiresAt);

    const baseUrl = process.env.VITE_APP_URL || process.env.FRONTEND_URL || "http://localhost:5173";
    const resetUrl = `${baseUrl}/reset-password?token=${token}&email=${encodeURIComponent(user.email)}`;

    // Send email with reset link
    void emailService
      .sendGenericEmail?.({
        to: user.email,
        subject: "Yêu cầu đặt lại mật khẩu - BatterySwap",
        text: `Chào ${user.fullName || "bạn"},\n\nBạn đã yêu cầu đặt lại mật khẩu. Vui lòng bấm vào liên kết sau để đặt lại mật khẩu:\n${resetUrl}\n\nLiên kết này sẽ hết hạn trong ${OTP_EXPIRES_MINUTES} phút.`,
        html: `
          <div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #0f172a;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h2 style="color: #059669; margin: 0; font-size: 22px; font-weight: 800;">BatterySwap System</h2>
              <p style="color: #64748b; font-size: 13px; margin-top: 4px;">Hệ thống quản lý pin xe điện thông minh</p>
            </div>
            <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 20px 0;" />
            <h3 style="color: #0f172a; font-size: 16px; font-weight: 700; margin-bottom: 12px;">Đặt lại mật khẩu tài khoản</h3>
            <p style="font-size: 14px; color: #334155; line-height: 1.6;">Chào <strong>${user.fullName || "bạn"}</strong>,</p>
            <p style="font-size: 14px; color: #334155; line-height: 1.6;">Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản Gmail của bạn trên hệ thống BatterySwap.</p>
            <p style="font-size: 14px; color: #334155; line-height: 1.6;">Vui lòng bấm vào nút bên dưới để tiến hành nhập mật khẩu mới:</p>
            <div style="text-align: center; margin: 28px 0;">
              <a href="${resetUrl}" style="background-color: #059669; color: #ffffff; padding: 12px 32px; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 14px; display: inline-block; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.25);">
                Đặt lại mật khẩu ngay
              </a>
            </div>
            <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0 16px 0;" />
            <p style="font-size: 12px; color: #94a3b8; margin: 0; text-align: center;">Liên kết này có hiệu lực trong ${OTP_EXPIRES_MINUTES} phút. Nếu bạn không gửi yêu cầu này, vui lòng bỏ qua email.</p>
          </div>
        `,
      })
      .catch((err: unknown) => console.error("[account-recovery] Failed to send reset link email", err));

    return { message: "If this email exists, a password reset link has been sent to your email." };
  },

  verifyResetOtp: async (input: VerifyResetOtpInput) => {
    const user = await repo.findUserByEmail(input.email);
    if (!user) throw new BadRequestError("Invalid OTP or email");

    const tokenHash = repo.hashOtp(input.otp);
    const token = await repo.findValidPasswordResetToken(tokenHash);
    if (!token || token.userId !== user.id) {
      throw new BadRequestError("Invalid or expired OTP");
    }

    return { valid: true, message: "OTP verified" };
  },

  resetPassword: async (input: ResetPasswordInput, context: { ipAddress?: string; userAgent?: string }) => {
    const user = await repo.findUserByEmail(input.email);
    if (!user) throw new BadRequestError("Invalid request");

    const tokenHash = repo.hashOtp(input.otp);
    const token = await repo.findValidPasswordResetToken(tokenHash);
    if (!token || token.userId !== user.id) {
      throw new BadRequestError("Invalid or expired OTP");
    }

    const newPasswordHash = await hashPassword(input.newPassword);

    await prisma.$transaction(async (tx) => {
      await tx.passwordResetToken.update({
        where: { id: token.id },
        data: { usedAt: new Date() },
      });
      await tx.user.update({
        where: { id: user.id },
        data: { passwordHash: newPasswordHash },
      });
      await tx.auditLog.create({
        data: {
          adminId: user.id,
          actorId: user.id,
          actorRole: user.role?.name ?? "MEMBER",
          action: "PASSWORD_RESET",
          entityType: "User",
          entityId: user.id,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
        },
      });
    });

    return { message: "Password reset successfully." };
  },

  // ─── Phone Number Change ────────────────────────────────────────────────────

  requestPhoneChange: async (
    userId: string,
    input: RequestPhoneChangeInput,
    context: { ipAddress?: string; userAgent?: string },
  ) => {
    const user = await prisma.user.findUnique({ where: { id: userId }, include: { role: true } });
    if (!user) throw new NotFoundError("User not found");

    // Check if new phone is already taken by another user
    const existing = await prisma.user.findFirst({
      where: { phone: input.newPhone, id: { not: userId } },
    });
    if (existing) throw new AppError("This phone number is already in use by another account", 409);

    const otp = generateOtp();
    const otpHash = repo.hashOtp(otp);
    const expiresAt = new Date(Date.now() + OTP_EXPIRES_MINUTES * 60_000);

    await repo.createPhoneChangeRequest(userId, input.newPhone, otpHash, expiresAt);

    // Send OTP to user's email (since no SMS service)
    void emailService
      .sendGenericEmail?.({
        to: user.email,
        subject: "Phone Number Change OTP",
        text: `Your OTP to change phone number to ${input.newPhone} is: ${otp}\n\nExpires in ${OTP_EXPIRES_MINUTES} minutes.`,
        html: `<p>Your OTP to change phone number to <strong>${input.newPhone}</strong> is: <strong>${otp}</strong></p><p>Expires in ${OTP_EXPIRES_MINUTES} minutes.</p>`,
      })
      .catch((err: unknown) => console.error("[account-recovery] Failed to send phone change OTP", err));

    void repo
      .createAuditLog({
        actorId: userId,
        actorRole: user.role?.name ?? "MEMBER",
        action: "PHONE_CHANGE_REQUESTED",
        entityType: "User",
        entityId: userId,
        after: { newPhone: `***${input.newPhone.slice(-4)}` },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      })
      .catch(console.error);

    return { message: "OTP sent to your registered email address." };
  },

  verifyPhoneChange: async (
    userId: string,
    input: VerifyPhoneChangeInput,
    context: { ipAddress?: string; userAgent?: string },
  ) => {
    const request = await repo.findLatestPhoneChangeRequest(userId);
    if (!request) throw new BadRequestError("No pending phone change request found.");

    if (request.attempts >= MAX_OTP_ATTEMPTS) {
      throw new BadRequestError("Too many incorrect attempts. Please request a new OTP.");
    }

    const otpHash = repo.hashOtp(input.otp);
    if (otpHash !== request.otpHash) {
      await repo.incrementPhoneChangeAttempts(request.id);
      throw new BadRequestError("Invalid OTP.");
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, include: { role: true } });
    if (!user) throw new NotFoundError("User not found");

    await prisma.$transaction(async (tx) => {
      await tx.phoneChangeRequest.update({
        where: { id: request.id },
        data: { verifiedAt: new Date() },
      });
      await tx.user.update({
        where: { id: userId },
        data: { phone: request.newPhone },
      });
      await tx.auditLog.create({
        data: {
          adminId: userId,
          actorId: userId,
          actorRole: user.role?.name ?? "MEMBER",
          action: "PHONE_NUMBER_CHANGED",
          entityType: "User",
          entityId: userId,
          before: { phone: user.phone ? `***${user.phone.slice(-4)}` : null },
          after: { phone: `***${request.newPhone.slice(-4)}` },
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
        },
      });
    });

    return { message: "Phone number updated successfully." };
  },

  // ─── Manual Recovery (Admin Review) ────────────────────────────────────────

  requestManualRecovery: async (input: ManualRecoveryInput, userId?: string) => {
    const recoveryRequest = await repo.createAccountRecoveryRequest({
      userId,
      contactEmail: input.contactEmail,
      contactPhone: input.contactPhone,
      description: input.description,
      documentUrls: input.documentUrls ?? [],
    });

    return { id: recoveryRequest.id, message: "Your recovery request has been submitted and is pending admin review." };
  },

  adminGetRecoveryRequests: async (params: {
    status?: "PENDING" | "UNDER_REVIEW" | "APPROVED" | "REJECTED";
    page: number;
    size: number;
  }) => {
    const [requests, total] = await repo.listAccountRecoveryRequests(params);
    return {
      content: requests,
      page: params.page,
      size: params.size,
      totalElements: total,
      totalPages: Math.ceil(total / params.size),
      first: params.page === 0,
      last: params.page >= Math.ceil(total / params.size) - 1 || total === 0,
    };
  },

  adminApproveRecovery: async (
    id: string,
    adminId: string,
    adminRole: string,
    data: { adminNotes?: string; resolvedAction?: string },
    context: { ipAddress?: string; userAgent?: string },
  ) => {
    const request = await repo.findAccountRecoveryRequestById(id);
    if (!request) throw new NotFoundError("Recovery request not found");
    if (request.status === "APPROVED" || request.status === "REJECTED") {
      throw new BadRequestError(`Request is already ${request.status.toLowerCase()}`);
    }

    await repo.updateRecoveryRequestStatus(id, "APPROVED", {
      reviewedBy: adminId,
      adminNotes: data.adminNotes,
      resolvedAction: data.resolvedAction,
    });

    void repo
      .createAuditLog({
        actorId: adminId,
        actorRole: adminRole,
        action: "ACCOUNT_RECOVERY_APPROVED",
        entityType: "AccountRecoveryRequest",
        entityId: id,
        before: { status: request.status },
        after: { status: "APPROVED" },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      })
      .catch(console.error);

    return { message: "Recovery request approved." };
  },

  adminRejectRecovery: async (
    id: string,
    adminId: string,
    adminRole: string,
    data: { adminNotes?: string; rejectionReason: string },
    context: { ipAddress?: string; userAgent?: string },
  ) => {
    const request = await repo.findAccountRecoveryRequestById(id);
    if (!request) throw new NotFoundError("Recovery request not found");
    if (request.status === "APPROVED" || request.status === "REJECTED") {
      throw new BadRequestError(`Request is already ${request.status.toLowerCase()}`);
    }

    if (!data.rejectionReason?.trim()) {
      throw new BadRequestError("Rejection reason is required");
    }

    await repo.updateRecoveryRequestStatus(id, "REJECTED", {
      reviewedBy: adminId,
      adminNotes: data.adminNotes,
      rejectionReason: data.rejectionReason,
    });

    void repo
      .createAuditLog({
        actorId: adminId,
        actorRole: adminRole,
        action: "ACCOUNT_RECOVERY_REJECTED",
        entityType: "AccountRecoveryRequest",
        entityId: id,
        before: { status: request.status },
        after: { status: "REJECTED", rejectionReason: data.rejectionReason },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      })
      .catch(console.error);

    return { message: "Recovery request rejected." };
  },
};
