import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../../config/env";

export type AccessTokenPayload = {
  sub: string;
  type: "access";
  tokenVersion?: number;
  iat?: number;
  exp?: number;
};

export type RefreshTokenPayload = {
  sub: string;
  type: "refresh";
  jti?: string;
  iat?: number;
  exp?: number;
};

export const signAccessToken = (payload: Omit<AccessTokenPayload, "iat" | "exp">): string => {
  const options: SignOptions = { expiresIn: env.JWT_ACCESS_EXPIRES_IN as SignOptions["expiresIn"] };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, options);
};

export const signRefreshToken = (payload: Omit<RefreshTokenPayload, "iat" | "exp">): string => {
  const options: SignOptions = { expiresIn: env.JWT_REFRESH_EXPIRES_IN as SignOptions["expiresIn"] };
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, options);
};

export const verifyAccessToken = (token: string): AccessTokenPayload => {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
  if (payload.type !== "access" || !payload.sub) {
    throw new Error("Invalid access token payload");
  }

  return payload;
};

export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  const payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
  if (payload.type !== "refresh" || !payload.sub) {
    throw new Error("Invalid refresh token payload");
  }

  return payload;
};
