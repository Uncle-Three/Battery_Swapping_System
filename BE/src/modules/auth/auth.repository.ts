import { AuthProvider, Prisma, RoleName } from "@prisma/client";
import { prisma } from "../../config/database";

export const authRepository = {
  findUserByEmail: (email: string) =>
    prisma.user.findFirst({
      where: { email },
      include: { role: true, wallet: true },
    }),

  findUserByIdForAuth: (id: string) =>
    prisma.user.findFirst({
      where: { id },
      include: { role: true },
    }),

  findUserByPhone: (phone: string) =>
    prisma.user.findFirst({
      where: { phone },
      include: { role: true, wallet: true },
    }),

  findUserByGoogleId: (googleId: string) =>
    prisma.user.findFirst({
      where: { googleId },
      include: { role: true, wallet: true },
    }),

  linkGoogleAccount: (userId: string, input: { googleId: string; avatarUrl?: string }) =>
    prisma.user.update({
      where: { id: userId },
      data: {
        googleId: input.googleId,
        authProvider: AuthProvider.BOTH,
<<<<<<< HEAD
        emailVerifiedAt: new Date(),
        emailVerificationRequired: false,
=======
>>>>>>> c1e66c0b73c4c02a2d09fc6d7459f123759cc74f
        ...(input.avatarUrl ? { avatarUrl: input.avatarUrl } : {}),
      },
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
          emailVerificationRequired: true,
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

  createGoogleMemberWithWallet: async (input: {
    email: string;
    passwordHash: string;
    fullName: string;
    googleId: string;
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
          googleId: input.googleId,
          authProvider: AuthProvider.GOOGLE,
          emailVerifiedAt: new Date(),
          emailVerificationRequired: false,
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

  createGoogleMemberWithWallet: async (input: {
    email: string;
    passwordHash: string;
    fullName: string;
    googleId: string;
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
          googleId: input.googleId,
          authProvider: AuthProvider.GOOGLE,
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
      data: { ...input, revokedAt: null },
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
          OR: [
            { revokedAt: null },
            { revokedAt: { isSet: false } },
          ],
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
          revokedAt: null,
          userAgent: input.userAgent,
          ipAddress: input.ipAddress,
        },
      });
    }),

  revokeRefreshSessionByTokenHash: (tokenHash: string) =>
    prisma.refreshSession.updateMany({
      where: {
        tokenHash,
        OR: [
          { revokedAt: null },
          { revokedAt: { isSet: false } },
        ],
      },
      data: {
        revokedAt: new Date(),
      },
    }),

  saveEmailVerificationToken: (userId: string, tokenHash: string, expiresAt: Date) =>
    prisma.$transaction(async (tx) => {
      await tx.emailVerificationToken.deleteMany({ where: { userId } });
      return tx.emailVerificationToken.create({ data: { userId, tokenHash, expiresAt } });
    }),

  findEmailVerificationToken: (tokenHash: string) =>
    prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
      include: { user: { include: { role: true, wallet: true } } },
    }),

  markEmailVerified: (userId: string, verifiedAt: Date) =>
    prisma.user.update({
      where: { id: userId },
      data: { emailVerifiedAt: verifiedAt, emailVerificationRequired: false },
      include: { role: true, wallet: true },
    }),

  isUniqueConstraintError: (error: unknown): boolean => {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
  },

};
