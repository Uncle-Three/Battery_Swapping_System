import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import compression from "compression";
import { randomUUID } from "node:crypto";
import { prisma } from "./config/database";
import { corsOptions } from "./config/cors";
import { env } from "./config/env";
import { swaggerSpec } from "./config/swagger";
import { apiRouter } from "./routes";
import { notFoundMiddleware } from "./common/middleware/not-found.middleware";
import { errorMiddleware } from "./common/middleware/error.middleware";

export const app = express();

app.use(helmet());
app.use(corsOptions);
app.set("trust proxy", env.NODE_ENV === "production" ? 1 : false);
app.use(compression());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use((req, res, next) => {
  const requestId = req.header("x-request-id") ?? randomUUID();
  res.setHeader("x-request-id", requestId);
  next();
});
app.use(
  rateLimit({
    windowMs: env.API_RATE_LIMIT_WINDOW_MS,
    limit: env.API_RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      code: "RATE_LIMITED",
      message: "Too many requests. Please try again later.",
      errors: [],
    },
  }),
);
app.use(
  pinoHttp({
    redact: ["req.headers.authorization", "req.headers.cookie", "res.headers.set-cookie"],
  }),
);

if (env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

app.get(["/health", "/api/v1/health"], (_req, res) => {
  res.status(200).json({
    success: true,
    data: { status: "ok", environment: env.NODE_ENV, timestamp: new Date().toISOString(), uptime: process.uptime() },
  });
});

app.get("/api/v1/health/database", async (_req, res, next) => {
  try {
    await prisma.$runCommandRaw({ ping: 1 });
    res.status(200).json({ success: true, data: { status: "ok" } });
  } catch (error) {
    next(error);
  }
});

if (env.SWAGGER_ENABLED) {
  app.get("/api-docs.json", (_req, res) => res.json(swaggerSpec));
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true }));
}
app.use("/api", apiRouter);
app.use(notFoundMiddleware);
app.use(errorMiddleware);
