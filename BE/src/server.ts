import { app } from "./app";
import { env } from "./config/env";
import { prisma } from "./config/database";
import { ensureCoreRoles } from "./modules/auth/role-bootstrap";
import { startBackgroundJobs } from "./modules/jobs/background-jobs.scheduler";
import { emailService } from "./modules/email/email.service";

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
  console.log("Gmail SMTP configuration:", {
    gmailUser: env.MAIL_USER || undefined,
    passwordLoaded: Boolean(env.MAIL_PASS),
    passwordLength: env.MAIL_PASS.length,
  });
  void emailService.verifyConnection().then(({ connected, skipped }) => {
    if (connected) console.log("Gmail SMTP connection verified successfully.");
    else if (skipped) console.log("Email delivery is disabled; Gmail SMTP verification skipped.");
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
