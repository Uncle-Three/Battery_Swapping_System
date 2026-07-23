import { prisma } from "../src/config/database";

const invalidBatteryCodeFilter = {
  $or: [
    { batteryCode: null },
    { batteryCode: { $exists: false } },
    { batteryCode: { $not: { $type: "string" } } },
  ],
};

const main = async (): Promise<void> => {
  const result = await prisma.$runCommandRaw({
    update: "batteries",
    updates: [{
      q: invalidBatteryCodeFilter,
      u: [{
        $set: {
          batteryCode: {
            $concat: ["BAT-MIGRATED-", { $toString: "$_id" }],
          },
        },
      }],
      multi: true,
    }],
  });

  const verification = await prisma.$runCommandRaw({
    count: "batteries",
    query: invalidBatteryCodeFilter,
  });
  const remaining = Number(verification.n ?? 0);
  if (remaining !== 0) {
    throw new Error(`Battery code repair incomplete: ${remaining} invalid records remain`);
  }

  console.log(`Battery code repair completed. Modified records: ${Number(result.nModified ?? 0)}`);
};

main()
  .catch((error: unknown) => {
    console.error("Failed to repair battery codes", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
