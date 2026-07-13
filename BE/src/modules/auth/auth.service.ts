import { authRepository } from "./auth.repository";
import type { LoginInput, RegisterInput } from "./auth.types";
import { ConflictError } from "../../common/errors/conflict-error";
import { AppError } from "../../common/errors/app-error";
import { UnauthorizedError } from "../../common/errors/unauthorized-error";
import { comparePassword, hashPassword } from "../../common/utils/password";
import { signAccessToken, verifyRefreshToken } from "../../common/utils/jwt";
import { createRefreshToken, hashRefreshToken } from "../../common/utils/refresh-token";
import { userMapper } from "../users/user.mapper";
import { UserStatus } from "@prisma/client";

const normalizeEmail = (email: string): string => email.trim().toLowerCase();
const dummyPasswordHash = "$2b$12$LQv3c1yqBWVHxkd0LQ4YCO4QOq7O8jT5BltjLw9hV8N77N8DVCcS";

type AuthRepository = typeof authRepository;

type AuthServiceDependencies = {
  repository: Pick<
    AuthRepository,
    | "findUserByEmail"
    | "findUserByPhone"
    | "createMemberWithWallet"
    | "isUniqueConstraintError"
    | "createRefreshSession"
    | "isUniqueConstraintError"
    | "findRefreshSessionByTokenHash"
    | "rotateRefreshSession"
    | "revokeRefreshSessionByTokenHash"
  >;
  hashPassword: (password: string) => Promise<string>;
  comparePassword: (password: string, hash: string) => Promise<boolean>;
  signAccessToken: (payload: { sub: string; type: "access"; tokenVersion?: number }) => string;
  verifyRefreshToken: (token: string) => { sub: string; type: "refresh" };
  createRefreshToken: (userId: string) => { token: string; tokenHash: string; expiresAt: Date };
  hashRefreshToken: (token: string) => string;
  now: () => Date;
};

type AuthRequestContext = {
  userAgent?: string;
  ipAddress?: string;
};

export const createAuthService = (dependencies: AuthServiceDependencies) => ({
  login: async (input: LoginInput, context: AuthRequestContext = {}) => {
    const email = normalizeEmail(input.email);
    const user = await dependencies.repository.findUserByEmail(email);

    if (!user) {
      await dependencies.comparePassword(input.password, dummyPasswordHash);
      throw new UnauthorizedError("Invalid credentials");
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedError("Account is not active");
    }

    const passwordMatches = await dependencies.comparePassword(input.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedError("Invalid credentials");
    }

    let refreshToken = dependencies.createRefreshToken(user.id);
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        await dependencies.repository.createRefreshSession({
          userId: user.id, tokenHash: refreshToken.tokenHash, expiresAt: refreshToken.expiresAt,
          userAgent: context.userAgent, ipAddress: context.ipAddress,
        });
        break;
      } catch (error) {
        if (!dependencies.repository.isUniqueConstraintError(error) || attempt === 2) throw error;
        refreshToken = dependencies.createRefreshToken(user.id);
      }
    }

    return {
      accessToken: dependencies.signAccessToken({ sub: user.id, type: "access" }),
      refreshToken: refreshToken.token,
      refreshTokenExpiresAt: refreshToken.expiresAt,
      tokenType: "Bearer",
      user: userMapper.toResponse(user),
    };
  },

  register: async (input: RegisterInput) => {
    const email = normalizeEmail(input.email);
    const phone = input.phone?.trim() || undefined;

    const existingEmail = await dependencies.repository.findUserByEmail(email);
    if (existingEmail) {
      throw new ConflictError("Email already exists");
    }

    if (phone) {
      const existingPhone = await dependencies.repository.findUserByPhone(phone);
      if (existingPhone) {
        throw new ConflictError("Phone already exists");
      }
    }

    const passwordHash = await dependencies.hashPassword(input.password);

    try {
      const user = await dependencies.repository.createMemberWithWallet({
        email,
        passwordHash,
        fullName: input.name.trim(),
        phone,
        avatarUrl: input.avatarUrl,
      });

      return {
        user: userMapper.toResponse(user),
      };
    } catch (error) {
      if (dependencies.repository.isUniqueConstraintError(error)) {
        throw new ConflictError("User already exists");
      }

      if (error instanceof Error && error.message === "MEMBER role is not configured") {
        throw new AppError("Default member role is not configured", 500);
      }

      throw error;
    }
  },

  refresh: async (refreshToken: string, context: AuthRequestContext = {}) => {
    const payload = dependencies.verifyRefreshToken(refreshToken);
    const tokenHash = dependencies.hashRefreshToken(refreshToken);
    const session = await dependencies.repository.findRefreshSessionByTokenHash(tokenHash);

    if (!session) {
      throw new UnauthorizedError("Invalid refresh token");
    }

    if (session.revokedAt || session.expiresAt <= dependencies.now()) {
      throw new UnauthorizedError("Invalid refresh token");
    }

    if (session.userId !== payload.sub) {
      throw new UnauthorizedError("Invalid refresh token");
    }

    if (session.user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedError("Account is not active");
    }

    const nextRefreshToken = dependencies.createRefreshToken(session.userId);

    try {
      await dependencies.repository.rotateRefreshSession({
        currentSessionId: session.id,
        userId: session.userId,
        tokenHash: nextRefreshToken.tokenHash,
        expiresAt: nextRefreshToken.expiresAt,
        userAgent: context.userAgent,
        ipAddress: context.ipAddress,
      });
    } catch (error) {
      if (error instanceof Error && error.message === "Refresh session is already revoked") {
        throw new UnauthorizedError("Invalid refresh token");
      }

      throw error;
    }

    return {
      accessToken: dependencies.signAccessToken({ sub: session.userId, type: "access" }),
      refreshToken: nextRefreshToken.token,
      refreshTokenExpiresAt: nextRefreshToken.expiresAt,
      tokenType: "Bearer",
      user: userMapper.toResponse(session.user),
    };
  },

  logout: async (refreshToken: string) => {
    try {
      dependencies.verifyRefreshToken(refreshToken);
    } catch {
      throw new UnauthorizedError("Invalid refresh token");
    }

    const tokenHash = dependencies.hashRefreshToken(refreshToken);
    const revoked = await dependencies.repository.revokeRefreshSessionByTokenHash(tokenHash);

    if (revoked.count !== 1) {
      throw new UnauthorizedError("Invalid refresh token");
    }
  },
});

export const authService = createAuthService({
  repository: authRepository,
  hashPassword,
  comparePassword,
  signAccessToken,
  verifyRefreshToken,
  createRefreshToken,
  hashRefreshToken,
  now: () => new Date(),
});
