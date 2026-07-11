import { Prisma, RoleName } from "@prisma/client";
import { prisma } from "../../config/database";

export const authRepository = {
  findUserByEmail: (email: string) =>
    prisma.user.findUnique({
      where: { email },
      include: { role: true, wallet: true },
    }),

  findUserByIdForAuth: (id: string) =>
    prisma.user.findUnique({
      where: { id },
      include: { role: true },
    }),

  findUserByPhone: (phone: string) =>
    prisma.user.findUnique({
      where: { phone },
      include: { role: true, wallet: true },
    }),

  createMemberWithWallet: async (input: {
    email: string;
    passwordHash: string;
    fullName: string;
    phone?: string;
    avatarUrl?: string;
  }) => {
    return prisma.$transaction(async (tx) => {
      const memberRole = await tx.role.findUnique({
        where: { name: RoleName.MEMBER },
      });

      if (!memberRole) {
        throw new Error("MEMBER role is not configured");
      }

      return tx.user.create({
        data: {
          email: input.email,
          passwordHash: input.passwordHash,
          fullName: input.fullName,
          phone: input.phone,
          avatarUrl: input.avatarUrl,
          roleId: memberRole.id,
          wallet: {
            create: {
              balance: 0,
            },
          },
        },
        include: { role: true, wallet: true },
      });
    });
  },

  createRefreshSession: (input: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    userAgent?: string;
    ipAddress?: string;
  }) =>
    prisma.refreshSession.create({
      data: input,
    }),

  findRefreshSessionByTokenHash: (tokenHash: string) =>
    prisma.refreshSession.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: { role: true, wallet: true },
        },
      },
    }),

  rotateRefreshSession: (input: {
    currentSessionId: string;
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    userAgent?: string;
    ipAddress?: string;
  }) =>
    prisma.$transaction(async (tx) => {
      const revoked = await tx.refreshSession.updateMany({
        where: {
          id: input.currentSessionId,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });

      if (revoked.count !== 1) {
        throw new Error("Refresh session is already revoked");
      }

      return tx.refreshSession.create({
        data: {
          userId: input.userId,
          tokenHash: input.tokenHash,
          expiresAt: input.expiresAt,
          userAgent: input.userAgent,
          ipAddress: input.ipAddress,
        },
      });
    }),

  revokeRefreshSessionByTokenHash: (tokenHash: string) =>
    prisma.refreshSession.updateMany({
      where: {
        tokenHash,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    }),

  isUniqueConstraintError: (error: unknown): boolean => {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
  },

};
