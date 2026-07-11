import type { RequestHandler } from "express";
import { authService } from "./auth.service";
import { clearRefreshTokenCookie, getRefreshTokenFromRequest, setRefreshTokenCookie } from "./auth.cookies";
import { UnauthorizedError } from "../../common/errors/unauthorized-error";
import { userService } from "../users/user.service";

const getAuthContext = (req: Parameters<RequestHandler>[0]) => ({
  userAgent: req.headers["user-agent"],
  ipAddress: req.ip,
});

const stripRefreshToken = <T extends { refreshToken?: string; refreshTokenExpiresAt?: Date }>(data: T) => {
  const { refreshToken: _refreshToken, refreshTokenExpiresAt: _refreshTokenExpiresAt, ...safeData } = data;
  return safeData;
};

export const authController = {
  login: (async (req, res) => {
    const data = await authService.login(req.body, getAuthContext(req));
    setRefreshTokenCookie(res, data.refreshToken, data.refreshTokenExpiresAt);
    res.status(200).json({ success: true, data: stripRefreshToken(data) });
  }) satisfies RequestHandler,

  register: (async (req, res) => {
    const data = await authService.register(req.body);
    res.status(201).json({ success: true, data });
  }) satisfies RequestHandler,

  getProfile: (async (req, res) => {
    const data = await userService.getProfile(req.user!.id);
    res.status(200).json({ success: true, data });
  }) satisfies RequestHandler,

  refresh: (async (req, res) => {
    const refreshToken = getRefreshTokenFromRequest(req);
    if (!refreshToken) {
      throw new UnauthorizedError("Missing refresh token");
    }

    const data = await authService.refresh(refreshToken, getAuthContext(req));
    setRefreshTokenCookie(res, data.refreshToken, data.refreshTokenExpiresAt);
    res.status(200).json({ success: true, data: stripRefreshToken(data) });
  }) satisfies RequestHandler,

  logout: (async (req, res) => {
    const refreshToken = getRefreshTokenFromRequest(req);
    if (!refreshToken) {
      throw new UnauthorizedError("Missing refresh token");
    }

    await authService.logout(refreshToken);
    clearRefreshTokenCookie(res);
    res.status(200).json({ success: true, message: "Logged out successfully" });
  }) satisfies RequestHandler,
};
