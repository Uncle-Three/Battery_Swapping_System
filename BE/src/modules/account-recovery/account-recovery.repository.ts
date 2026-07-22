import { prisma } from "../../config/database";
import { createHash } from "node:crypto";

export const accountRecoveryRepository = {
  // ─── Password Reset ────────────────────────────────────────────────────────

  findUserByEmail: (email: string) =>
    prisma.user.findUnique({
      where: { email },
      include: { role: true },
    }),

  createPasswordResetToken: (userId: string, tokenHash: string, expiresAt: Date) =>
    prisma.passwordResetToken.create({
      data: { userId, tokenHash, expiresAt },
    }),

  findValidPasswordResetToken: (tokenHash: string) =>
    prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        usedAt: { isSet: false },
        expiresAt: { gt: new Date() },
      },
    }),

  markPasswordResetTokenUsed: (id: string) =>
    prisma.passwordResetToken.update({
      where: { id },
      data: { usedAt: new Date() },
    }),

  invalidateAllPasswordResetTokens: (userId: string) =>
    prisma.passwordResetToken.updateMany({
      where: { userId, usedAt: { isSet: false } },
      data: { usedAt: new Date() },
    }),

  updateUserPassword: (userId: string, passwordHash: string) =>
    prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    }),

  // ─── Phone Change ──────────────────────────────────────────────────────────

  createPhoneChangeRequest: (userId: string, newPhone: string, otpHash: string, expiresAt: Date) =>
    prisma.phoneChangeRequest.create({
      data: { userId, newPhone, otpHash, expiresAt },
    }),

  findLatestPhoneChangeRequest: (userId: string) =>
    prisma.phoneChangeRequest.findFirst({
      where: {
        userId,
        verifiedAt: { isSet: false },
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    }),

  incrementPhoneChangeAttempts: (id: string) =>
    prisma.phoneChangeRequest.update({
      where: { id },
      data: { attempts: { increment: 1 } },
    }),

  markPhoneChangeVerified: (id: string) =>
    prisma.phoneChangeRequest.update({
      where: { id },
      data: { verifiedAt: new Date() },
    }),

  updateUserPhone: (userId: string, phone: string) =>
    prisma.user.update({
      where: { id: userId },
      data: { phone },
    }),

  // ─── Manual Recovery Requests ──────────────────────────────────────────────

  createAccountRecoveryRequest: (data: {
    userId?: string;
    contactEmail: string;
    contactPhone?: string;
    description: string;
    documentUrls: string[];
  }) =>
    prisma.accountRecoveryRequest.create({ data }),

  findAccountRecoveryRequestById: (id: string) =>
    prisma.accountRecoveryRequest.findUnique({ where: { id } }),

  listAccountRecoveryRequests: (params: {
    status?: "PENDING" | "UNDER_REVIEW" | "APPROVED" | "REJECTED";
    page: number;
    size: number;
  }) => {
    const where = params.status ? { status: params.status } : {};
    return Promise.all([
      prisma.accountRecoveryRequest.findMany({
        where,
        skip: params.page * params.size,
        take: params.size,
        orderBy: { createdAt: "desc" },
      }),
      prisma.accountRecoveryRequest.count({ where }),
    ]);
  },

  updateRecoveryRequestStatus: (
    id: string,
    status: "UNDER_REVIEW" | "APPROVED" | "REJECTED",
    data: {
      reviewedBy?: string;
      adminNotes?: string;
      rejectionReason?: string;
      resolvedAction?: string;
    },
  ) =>
    prisma.accountRecoveryRequest.update({
      where: { id },
      data: {
        status,
        reviewedAt: new Date(),
        ...data,
      },
    }),

  // ─── Audit Log Helper ──────────────────────────────────────────────────────

  createAuditLog: (data: {
    actorId: string;
    actorRole: string;
    action: string;
    entityType: string;
    entityId: string;
    before?: object;
    after?: object;
    ipAddress?: string;
    userAgent?: string;
  }) =>
    prisma.auditLog.create({
      data: {
        adminId: data.actorId,
        actorId: data.actorId,
        actorRole: data.actorRole,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        before: data.before ?? null,
        after: data.after ?? null,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    }),

  hashOtp: (otp: string) => createHash("sha256").update(otp).digest("hex"),
};
