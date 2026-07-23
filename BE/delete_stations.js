const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  try {
    // Drop all swap transactions first to avoid orphans
    await prisma.$runCommandRaw({
      delete: "swap_transactions",
      deletes: [{ q: {}, limit: 0 }]
    });
    // Drop all battery slots
    await prisma.$runCommandRaw({
      delete: "battery_slots",
      deletes: [{ q: {}, limit: 0 }]
    });
    // Drop all stations
    await prisma.$runCommandRaw({
      delete: "stations",
      deletes: [{ q: {}, limit: 0 }]
    });
    console.log('Deleted stations and related raw data');
  } catch(e) {
    console.error(e);
  }
}
run().then(() => prisma.$disconnect()).catch(console.error);
