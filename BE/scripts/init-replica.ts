import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const directUrl = "mongodb://127.0.0.1:27017/admin?directConnection=true";
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: directUrl,
    },
  },
});

async function main() {
  try {
    console.log("Connecting directly to MongoDB to initiate replica set rs0...");
    const res = await prisma.$runCommandRaw({ replSetInitiate: {} });
    console.log("SUCCESS! Replica set initiated:", JSON.stringify(res, null, 2));
  } catch (err: any) {
    if (err?.message?.includes("already initialized")) {
      console.log("SUCCESS: MongoDB replica set is ALREADY initialized!");
    } else {
      console.log("Initiate output:", err.message || err);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();
