import { authRepository } from "./auth.repository";
<<<<<<< HEAD
import type { GoogleLoginInput, LoginInput, RegisterInput, ResendVerificationInput, VerifyEmailInput } from "./auth.types";
=======
import type { GoogleLoginInput, LoginInput, RegisterInput } from "./auth.types";
>>>>>>> c1e66c0b73c4c02a2d09fc6d7459f123759cc74f
import { ConflictError } from "../../common/errors/conflict-error";
import { AppError } from "../../common/errors/app-error";
import { UnauthorizedError } from "../../common/errors/unauthorized-error";
import { comparePassword, hashPassword } from "../../common/utils/password";
import { signAccessToken, verifyRefreshToken } from "../../common/utils/jwt";
import { createRefreshToken, hashRefreshToken } from "../../common/utils/refresh-token";
import { userMapper } from "../users/user.mapper";
import { AuthProvider, UserStatus } from "@prisma/client";
import { OAuth2Client } from "google-auth-library";
import { randomUUID } from "crypto";
import { env } from "../../config/env";
<<<<<<< HEAD
import { createHash, randomBytes } from "node:crypto";
import { BadRequestError } from "../../common/errors/bad-request-error";
import { EmailVerificationRequiredError } from "../../common/errors/email-verification-required-error";
import { emailService } from "../email/email.service";
=======
>>>>>>> c1e66c0b73c4c02a2d09fc6d7459f123759cc74f

const normalizeEmail = (email: string): string => email.trim().toLowerCase();
const dummyPasswordHash = "$2b$12$LQv3c1yqBWVHxkd0LQ4YCO4QOq7O8jT5BltjLw9hV8N77N8DVCcS";
const googleClient = new OAuth2Client();

type AuthRepository = typeof authRepository;

type AuthServiceDependencies = {
  repository: Pick<
    AuthRepository,
    | "findUserByEmail"
    | "findUserByGoogleId"
    | "findUserByPhone"
    | "createMemberWithWallet"
    | "createGoogleMemberWithWallet"
    | "linkGoogleAccount"
    | "isUniqueConstraintError"
    | "createRefreshSession"
    | "isUniqueConstraintError"
    | "findRefreshSessionByTokenHash"
    | "rotateRefreshSession"
    | "revokeRefreshSessionByTokenHash"
    | "saveEmailVerificationToken"
    | "findEmailVerificationToken"
    | "markEmailVerified"
  >;
  hashPassword: (password: string) => Promise<string>;
  comparePassword: (password: string, hash: string) => Promise<boolean>;
  signAccessToken: (payload: { sub: string; type: "access"; tokenVersion?: number }) => string;
  verifyRefreshToken: (token: string) => { sub: string; type: "refresh" };
  createRefreshToken: (userId: string) => { token: string; tokenHash: string; expiresAt: Date };
  hashRefreshToken: (token: string) => string;
  now: () => Date;
  createVerificationToken: () => string;
  hashVerificationToken: (token: string) => string;
  emailService: Pick<typeof emailService, "sendVerificationEmail" | "sendEmailVerified">;
};

type AuthRequestContext = {
  userAgent?: string;
  ipAddress?: string;
};

const createSessionResponse = async (
  user: Awaited<ReturnType<AuthRepository["findUserByEmail"]>>,
  dependencies: AuthServiceDependencies,
  context: AuthRequestContext,
) => {
  if (!user) throw new UnauthorizedError("Invalid credentials");

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
};

<<<<<<< HEAD
export const createAuthService = (dependencies: AuthServiceDependencies) => {
  const issueVerificationEmail = async (user: { id: string; email: string; fullName: string }) => {
    const token = dependencies.createVerificationToken();
    const tokenHash = dependencies.hashVerificationToken(token);
    const expiresAt = new Date(dependencies.now().getTime() + env.EMAIL_VERIFICATION_EXPIRES_MINUTES * 60_000);
    await dependencies.repository.saveEmailVerificationToken(user.id, tokenHash, expiresAt);
    return dependencies.emailService.sendVerificationEmail({
      customerName: user.fullName,
      customerEmail: user.email,
      verificationUrl: `${env.CLIENT_URL.replace(/\/$/, "")}/verify-email?token=${encodeURIComponent(token)}`,
      expiresMinutes: env.EMAIL_VERIFICATION_EXPIRES_MINUTES,
    });
  };

  return ({
=======
export const createAuthService = (dependencies: AuthServiceDependencies) => ({
>>>>>>> c1e66c0b73c4c02a2d09fc6d7459f123759cc74f
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

<<<<<<< HEAD
    if (user.emailVerificationRequired === true && !user.emailVerifiedAt) {
      throw new EmailVerificationRequiredError();
    }

=======
>>>>>>> c1e66c0b73c4c02a2d09fc6d7459f123759cc74f
    return createSessionResponse(user, dependencies, context);
  },

  loginWithGoogle: async (input: GoogleLoginInput, context: AuthRequestContext = {}) => {
    if (!env.GOOGLE_CLIENT_ID) {
      throw new AppError("Google login is not configured", 500);
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: input.idToken,
      audience: env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const googleId = payload?.sub;
    const email = payload?.email ? normalizeEmail(payload.email) : undefined;
    const fullName = payload?.name?.trim() || email?.split("@")[0] || "Google User";
    const avatarUrl = payload?.picture;

    if (!googleId || !email || payload?.email_verified !== true) {
      throw new UnauthorizedError("Google account email is not verified");
    }

    let user = await dependencies.repository.findUserByGoogleId(googleId);
    if (!user) {
      const existingByEmail = await dependencies.repository.findUserByEmail(email);
      if (existingByEmail) {
        if (existingByEmail.googleId && existingByEmail.googleId !== googleId) {
          throw new ConflictError("Email is already linked to another Google account");
        }
        user = existingByEmail.googleId
          ? existingByEmail
          : await dependencies.repository.linkGoogleAccount(existingByEmail.id, { googleId, avatarUrl });
      } else {
        const passwordHash = await dependencies.hashPassword(`google:${googleId}:${randomUUID()}`);
        user = await dependencies.repository.createGoogleMemberWithWallet({
          email,
          passwordHash,
          fullName,
          googleId,
          avatarUrl,
        });
      }
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedError("Account is not active");
    }

<<<<<<< HEAD
    if (!user.emailVerifiedAt) {
      user = await dependencies.repository.markEmailVerified(user.id, dependencies.now());
    }

=======
>>>>>>> c1e66c0b73c4c02a2d09fc6d7459f123759cc74f
    if (user.authProvider === AuthProvider.LOCAL && !user.googleId) {
      user = await dependencies.repository.linkGoogleAccount(user.id, { googleId, avatarUrl });
    }

    return createSessionResponse(user, dependencies, context);
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

      let emailSent = false;
      try {
        const delivery = await issueVerificationEmail(user);
        emailSent = delivery.sent;
      } catch (error) {
        // The account already exists at this point. Return a recoverable state
        // so the user can use the resend endpoint instead of receiving a false
        // registration failure followed by an "email already exists" conflict.
        console.error("[auth] failed to create or send email verification", error);
      }

      return {
        user: userMapper.toResponse(user),
        requiresEmailVerification: true,
        emailSent,
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

  verifyEmail: async (input: VerifyEmailInput) => {
    const tokenHash = dependencies.hashVerificationToken(input.token);
    const record = await dependencies.repository.findEmailVerificationToken(tokenHash);
    if (!record || record.expiresAt <= dependencies.now()) {
      throw new BadRequestError("Email verification link is invalid or expired");
    }

    const wasAlreadyVerified = Boolean(record.user.emailVerifiedAt);
    const user = wasAlreadyVerified
      ? record.user
      : await dependencies.repository.markEmailVerified(record.userId, dependencies.now());
    // Email verification is complete once the database transaction above has
    // succeeded. Do not keep the API response waiting for SMTP: a slow mail
    // server can otherwise outlive the client's request timeout even though
    // the account has already been activated.
    if (!wasAlreadyVerified) {
      void dependencies.emailService.sendEmailVerified({
        customerName: user.fullName,
        customerEmail: user.email,
      }).catch((error) => {
        console.error("[auth] failed to send email verification confirmation", error);
      });
    }
    return { user: userMapper.toResponse(user) };
  },

  resendVerification: async (input: ResendVerificationInput) => {
    const user = await dependencies.repository.findUserByEmail(normalizeEmail(input.email));
    if (user && user.emailVerificationRequired === true && !user.emailVerifiedAt && user.status === UserStatus.ACTIVE) {
      await issueVerificationEmail(user);
    }
    return { message: "If the account exists and is not verified, a new verification email has been sent" };
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
    if (session.user.emailVerificationRequired === true && !session.user.emailVerifiedAt) {
      throw new EmailVerificationRequiredError();
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
};

export const authService = createAuthService({
  repository: authRepository,
  hashPassword,
  comparePassword,
  signAccessToken,
  verifyRefreshToken,
  createRefreshToken,
  hashRefreshToken,
  now: () => new Date(),
  createVerificationToken: () => randomBytes(32).toString("hex"),
  hashVerificationToken: (token) => createHash("sha256").update(token).digest("hex"),
  emailService,
});
