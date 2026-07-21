import { RoleName, type PrismaClient } from "@prisma/client";

export const ensureCoreRoles = async (client: Pick<PrismaClient, "role">): Promise<void> => {
  await Promise.all(
    [RoleName.MEMBER, RoleName.STAFF, RoleName.TECHNICIAN, RoleName.MANAGER, RoleName.ADMIN].map((name) =>
      client.role.upsert({
        where: { name },
        update: {},
        create: { name },
      }),
    ),
  );
};
