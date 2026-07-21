import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { AppError } from "../errors/app-error";
import { Prisma } from "@prisma/client";

export const errorMiddleware: ErrorRequestHandler = (error, req, res, _next) => {
  const requestId = res.getHeader("x-request-id")?.toString() ?? req.header("x-request-id") ?? undefined;
  if (error instanceof ZodError) {
    res.status(400).json({
      success: false,
      code: "VALIDATION_ERROR",
      message: "Validation failed",
      errors: error.flatten(),
      requestId,
    });
    return;
  }

  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      code: error.name.replace(/Error$/, "").toUpperCase() || "APPLICATION_ERROR",
      message: error.message,
      errors: [],
      requestId,
    });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const duplicate = error.code === "P2002";
    res.status(duplicate ? 409 : 400).json({
      success: false,
      code: duplicate ? "RESOURCE_CONFLICT" : "DATABASE_ERROR",
      message: duplicate ? "A unique value already exists" : "Database operation failed",
      errors: [],
      requestId,
    });
    return;
  }

  res.status(500).json({
    success: false,
    code: "INTERNAL_SERVER_ERROR",
    message: "Internal server error",
    errors: [],
    requestId,
  });
};
