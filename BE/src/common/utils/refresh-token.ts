import crypto from "node:crypto";
import { signRefreshToken, verifyRefreshToken } from "./jwt";

export type RefreshTokenResult = {
  token: string;
  tokenHash: string;
  expiresAt: Date;
};

export const hashRefreshToken = (token: string): string => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

export const createRefreshToken = (userId: string): RefreshTokenResult => {
  const token = signRefreshToken({ sub: userId, type: "refresh", jti: crypto.randomUUID() });
  const payload = verifyRefreshToken(token);

  if (!payload.exp) {
    throw new Error("Refresh token expiry is missing");
  }

  return {
    token,
    tokenHash: hashRefreshToken(token),
    expiresAt: new Date(payload.exp * 1000),
  };
};
