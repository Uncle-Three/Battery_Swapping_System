import { describe, expect, it, vi } from "vitest";
import { AuthProvider, RoleName, UserStatus } from "@prisma/client";
import { createAuthService } from "../modules/auth/auth.service";
import { EmailVerificationRequiredError } from "../common/errors/email-verification-required-error";

const now = new Date("2026-07-22T12:00:00.000Z");

const makeUser = (emailVerifiedAt: Date | null = null) => ({
  id: "507f1f77bcf86cd799439011",
  roleId: "507f1f77bcf86cd799439012",
  fullName: "Nguyen Van A",
  phone: null,
  email: "member@example.com",
  emailVerifiedAt,
  emailVerificationRequired: true,
  passwordHash: "hashed-password",
  googleId: null,
  authProvider: AuthProvider.LOCAL,
  rfidCard: null,
  licensePlate: null,
  avatarUrl: null,
  status: UserStatus.ACTIVE,
  createdAt: now,
  updatedAt: now,
  role: { id: "507f1f77bcf86cd799439012", name: RoleName.MEMBER, createdAt: now, updatedAt: now },
  wallet: null,
});

const setup = () => {
  const user = makeUser();
  const repository = {
    findUserByEmail: vi.fn(),
    findUserByGoogleId: vi.fn(),
    findUserByPhone: vi.fn(),
    createMemberWithWallet: vi.fn(),
    createGoogleMemberWithWallet: vi.fn(),
    linkGoogleAccount: vi.fn(),
    isUniqueConstraintError: vi.fn(() => false),
    createRefreshSession: vi.fn(),
    findRefreshSessionByTokenHash: vi.fn(),
    rotateRefreshSession: vi.fn(),
    revokeRefreshSessionByTokenHash: vi.fn(),
    saveEmailVerificationToken: vi.fn(),
    findEmailVerificationToken: vi.fn(),
    markEmailVerified: vi.fn(),
  };
  const mail = {
    sendVerificationEmail: vi.fn().mockResolvedValue({ sent: true, skipped: false }),
    sendEmailVerified: vi.fn().mockResolvedValue({ sent: true, skipped: false }),
  };
  const dependencies = {
    repository,
    hashPassword: vi.fn().mockResolvedValue("hashed-password"),
    comparePassword: vi.fn().mockResolvedValue(true),
    signAccessToken: vi.fn(() => "access-token"),
    verifyRefreshToken: vi.fn(),
    createRefreshToken: vi.fn(() => ({ token: "refresh-token", tokenHash: "refresh-hash", expiresAt: new Date(now.getTime() + 60_000) })),
    hashRefreshToken: vi.fn(),
    now: () => now,
    createVerificationToken: () => "verification-token",
    hashVerificationToken: vi.fn(() => "verification-hash"),
    emailService: mail,
  } as unknown as Parameters<typeof createAuthService>[0];

  return { service: createAuthService(dependencies), repository, mail, user };
};

describe("email verification auth flow", () => {
  it("creates a one-time token and sends verification mail after registration", async () => {
    const { service, repository, mail, user } = setup();
    repository.findUserByEmail.mockResolvedValue(null);
    repository.createMemberWithWallet.mockResolvedValue(user);

    const result = await service.register({ email: user.email, password: "123456", name: user.fullName });

    expect(repository.saveEmailVerificationToken).toHaveBeenCalledWith(user.id, "verification-hash", expect.any(Date));
    expect(mail.sendVerificationEmail).toHaveBeenCalledWith(expect.objectContaining({
      customerEmail: user.email,
      verificationUrl: expect.stringMatching(/\/verify-email\?token=verification-token$/),
    }));
    expect(result).toMatchObject({ requiresEmailVerification: true, emailSent: true });
  });

  it("blocks password login until the email is verified", async () => {
    const { service, repository, user } = setup();
    repository.findUserByEmail.mockResolvedValue(user);

    const login = service.login({ email: user.email, password: "123456" });
    await expect(login).rejects.toBeInstanceOf(EmailVerificationRequiredError);
    await expect(login).rejects.toMatchObject({
      name: "EmailVerificationRequiredError",
      message: "Email verification is required",
      statusCode: 403,
    });
    expect(repository.createRefreshSession).not.toHaveBeenCalled();
  });

  it("consumes a valid token and sends the activation confirmation", async () => {
    const { service, repository, mail, user } = setup();
    const verifiedUser = makeUser(now);
    repository.findEmailVerificationToken.mockResolvedValue({
      id: "507f1f77bcf86cd799439013",
      userId: user.id,
      tokenHash: "verification-hash",
      expiresAt: new Date(now.getTime() + 60_000),
      createdAt: now,
      user,
    });
    repository.markEmailVerified.mockResolvedValue(verifiedUser);

    const result = await service.verifyEmail({ token: "verification-token" });

    expect(repository.markEmailVerified).toHaveBeenCalledWith(user.id, now);
    expect(mail.sendEmailVerified).toHaveBeenCalledWith({ customerName: user.fullName, customerEmail: user.email });
    expect(result.user.emailVerified).toBe(true);
  });

  it("returns verification success without waiting for the confirmation email", async () => {
    const { service, repository, mail, user } = setup();
    const verifiedUser = makeUser(now);
    repository.findEmailVerificationToken.mockResolvedValue({
      id: "507f1f77bcf86cd799439013",
      userId: user.id,
      tokenHash: "verification-hash",
      expiresAt: new Date(now.getTime() + 60_000),
      createdAt: now,
      user,
    });
    repository.markEmailVerified.mockResolvedValue(verifiedUser);
    mail.sendEmailVerified.mockReturnValue(new Promise(() => undefined));

    const result = await service.verifyEmail({ token: "verification-token" });

    expect(result.user.emailVerified).toBe(true);
    expect(mail.sendEmailVerified).toHaveBeenCalledOnce();
  });

  it("returns success when the same valid link is opened again", async () => {
    const { service, repository, mail, user } = setup();
    const verifiedUser = makeUser(now);
    repository.findEmailVerificationToken.mockResolvedValue({
      id: "507f1f77bcf86cd799439013",
      userId: user.id,
      tokenHash: "verification-hash",
      expiresAt: new Date(now.getTime() + 60_000),
      createdAt: now,
      user: verifiedUser,
    });

    const result = await service.verifyEmail({ token: "verification-token" });

    expect(result.user.emailVerified).toBe(true);
    expect(repository.markEmailVerified).not.toHaveBeenCalled();
    expect(mail.sendEmailVerified).not.toHaveBeenCalled();
  });

  it("rejects an expired verification token", async () => {
    const { service, repository, user } = setup();
    repository.findEmailVerificationToken.mockResolvedValue({
      id: "507f1f77bcf86cd799439013",
      userId: user.id,
      tokenHash: "verification-hash",
      expiresAt: new Date(now.getTime() - 1),
      createdAt: now,
      user,
    });

    await expect(service.verifyEmail({ token: "verification-token" })).rejects.toThrow("invalid or expired");
    expect(repository.markEmailVerified).not.toHaveBeenCalled();
  });
});
