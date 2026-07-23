import bcrypt from "bcrypt";
import { RoleName } from "@prisma/client";
import { prisma } from "../src/config/database";
import { env } from "../src/config/env";

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;

if (!email || !/^\S+@\S+\.\S+$/.test(email)) throw new Error("ADMIN_EMAIL must be a valid email");
if (!password || password.length < 6) throw new Error("ADMIN_PASSWORD must contain at least 6 characters");

const main = async (): Promise<void> => {
  const role = await prisma.role.upsert({
    where: { name: RoleName.ADMIN },
    update: {},
    create: { name: RoleName.ADMIN },
  });
  const passwordHash = await bcrypt.hash(password, env.BCRYPT_SALT_ROUNDS);
  const admin = await prisma.user.upsert({
    where: { email },
    update: { roleId: role.id, passwordHash, status: "ACTIVE" },
    create: { email, fullName: "System Admin", passwordHash, roleId: role.id, status: "ACTIVE" },
    select: { id: true, email: true, status: true, role: { select: { name: true } } },
  });
  console.log("Admin account ready", admin);
};

main()
  .catch((error: unknown) => {
    console.error("Failed to create admin account", error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
