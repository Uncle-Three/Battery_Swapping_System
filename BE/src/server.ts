import { app } from "./app";
import { env } from "./config/env";
import { prisma } from "./config/database";
import { ensureCoreRoles } from "./modules/auth/role-bootstrap";
import { startBackgroundJobs } from "./modules/jobs/background-jobs.scheduler";

(async () => {
  try {
    await ensureCoreRoles(prisma);
    console.log("Core roles bootstrapped successfully.");
  } catch (error) {
    console.error("Failed to bootstrap core roles:", error);
    await prisma.$disconnect();
    process.exit(1);
  }

  const server = app.listen(env.PORT, () => {
    console.log(`API server listening on port ${env.PORT}`);
  });
  const stopBackgroundJobs = startBackgroundJobs();

  const shutdown = async () => {
    console.log("Shutting down API server...");
    stopBackgroundJobs();
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
})();
