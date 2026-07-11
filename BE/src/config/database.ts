import { PrismaClient } from "@prisma/client";
import { env } from "./env";

export const prisma = new PrismaClient({
  datasourceUrl: env.DATABASE_URL,
  log: env.LOG_LEVEL === "debug" ? ["query", "error", "warn"] : ["error", "warn"],
});
