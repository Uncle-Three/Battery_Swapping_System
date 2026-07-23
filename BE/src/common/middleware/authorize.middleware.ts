import type { RequestHandler } from "express";
import { AppError } from "../errors/app-error";
import type { Role } from "../../constants/roles";

export const authorize = (...roles: Role[]): RequestHandler => {
  return (req, _res, next) => {
    if (!req.user) {
      next(new AppError("Authentication required", 401));
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(new AppError("Forbidden", 403));
      return;
    }

    next();
  };
};

