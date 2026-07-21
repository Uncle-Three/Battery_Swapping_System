import type { RequestHandler } from "express";
import { UserStatus } from "@prisma/client";
import { UnauthorizedError } from "../errors/unauthorized-error";
import { verifyAccessToken } from "../utils/jwt";
import { authRepository } from "../../modules/auth/auth.repository";
import { isRole } from "../../constants/roles";

export const authenticate: RequestHandler = async (req, _res, next) => {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    next(new UnauthorizedError("Missing bearer token"));
    return;
  }

  try {
    const payload = verifyAccessToken(header.replace("Bearer ", ""));
    const user = await authRepository.findUserByIdForAuth(payload.sub);

    if (!user || user.status !== UserStatus.ACTIVE || !isRole(user.role.name)) {
      next(new UnauthorizedError("Invalid or expired token"));
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role.name,
      status: user.status,
    };
    next();
  } catch {
    next(new UnauthorizedError("Invalid or expired token"));
  }
};
