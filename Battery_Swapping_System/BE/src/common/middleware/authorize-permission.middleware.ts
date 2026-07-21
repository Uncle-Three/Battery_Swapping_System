import type { RequestHandler } from "express";
import { ForbiddenError } from "../errors/forbidden-error";
import { UnauthorizedError } from "../errors/unauthorized-error";
import { hasPermission, type Permission } from "../../constants/permissions";

export const authorizePermission = (permission: Permission): RequestHandler => {
  return (req, _res, next) => {
    if (!req.user) {
      next(new UnauthorizedError("Authentication required"));
      return;
    }

    if (!hasPermission(req.user.role, permission)) {
      next(new ForbiddenError());
      return;
    }

    next();
  };
};
