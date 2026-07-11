import type { CookieOptions, Request, Response } from "express";
import { env } from "../../config/env";

export const refreshTokenCookieName = "refreshToken";

export const refreshTokenCookieOptions = (expiresAt?: Date): CookieOptions => ({
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/api/auth",
  ...(expiresAt ? { expires: expiresAt } : {}),
});

export const setRefreshTokenCookie = (res: Response, token: string, expiresAt: Date): void => {
  res.cookie(refreshTokenCookieName, token, refreshTokenCookieOptions(expiresAt));
};

export const clearRefreshTokenCookie = (res: Response): void => {
  res.clearCookie(refreshTokenCookieName, refreshTokenCookieOptions());
};

export const getRefreshTokenFromRequest = (req: Request): string | undefined => {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) {
    return undefined;
  }

  const cookies = cookieHeader.split(";").map((cookie) => cookie.trim());
  const refreshCookie = cookies.find((cookie) => cookie.startsWith(`${refreshTokenCookieName}=`));

  if (!refreshCookie) {
    return undefined;
  }

  return decodeURIComponent(refreshCookie.slice(refreshTokenCookieName.length + 1));
};
