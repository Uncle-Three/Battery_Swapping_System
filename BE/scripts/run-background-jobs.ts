import { prisma } from "../src/config/database";
import { runBackgroundJobs } from "../src/modules/jobs/background-jobs.scheduler";

runBackgroundJobs()
  .then((summaries) => console.log(JSON.stringify(summaries, null, 2)))
  .catch((error: unknown) => { console.error("Background jobs failed", error); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
