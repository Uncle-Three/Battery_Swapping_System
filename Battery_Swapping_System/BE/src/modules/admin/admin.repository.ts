import { RoleName, UserStatus, type Prisma } from "@prisma/client";
import { prisma } from "../../config/database";
import type { Role } from "../../constants/roles";

const userInclude = {
  role: true,
  wallet: true,
} satisfies Prisma.UserInclude;

const activeAdminWhere = {
  status: UserStatus.ACTIVE,
  role: {
    name: RoleName.ADMIN,
  },
} satisfies Prisma.UserWhereInput;

export const adminRepository = {
  findUsers: () =>
    prisma.user.findMany({
      include: userInclude,
      orderBy: { createdAt: "desc" },
    }),

  findUserById: (id: string) =>
    prisma.user.findUnique({
      where: { id },
      include: userInclude,
    }),

  findRoleByName: (name: Role) =>
    prisma.role.findUnique({
      where: { name },
    }),

  countActiveAdmins: () => prisma.user.count({ where: activeAdminWhere }),
  findSettings: () => prisma.systemSetting.findMany({ orderBy: { key: "asc" } }),
  upsertSettingWithAudit: (adminId: string, key: string, value: string) => prisma.$transaction(async (tx) => {
    const before = await tx.systemSetting.findUnique({ where: { key } });
    const setting = await tx.systemSetting.upsert({ where: { key }, update: { value }, create: { key, value } });
    await tx.auditLog.create({ data: { adminId, actorRole: "ADMIN", entityType: "SystemSetting", entityId: setting.id, action: "UPSERT_SYSTEM_SETTING", before: before ? { key, value: before.value } : undefined, after: { key, value } } });
    return setting;
  }),

  updateUserRoleWithAudit: (input: {
    adminId: string;
    targetUserId: string;
    roleId: string;
    oldRole: string;
    newRole: string;
    protectLastAdmin: boolean;
    protectSelfDemotion: boolean;
  }) =>
    prisma.$transaction(async (tx) => {
      if (input.protectSelfDemotion) {
        throw new Error("ADMIN_SELF_DEMOTION");
      }

      if (input.protectLastAdmin) {
        const activeAdmins = await tx.user.count({ where: activeAdminWhere });
        if (activeAdmins <= 1) {
          throw new Error("LAST_ACTIVE_ADMIN");
        }
      }

      const user = await tx.user.update({
        where: { id: input.targetUserId },
        data: { roleId: input.roleId },
        include: userInclude,
      });

      await tx.auditLog.create({
        data: {
          adminId: input.adminId,
          action: "UPDATE_USER_ROLE",
          details: JSON.stringify({
            targetUserId: input.targetUserId,
            oldValue: input.oldRole,
            newValue: input.newRole,
          }),
        },
      });

      return user;
    }),

  updateUserStatusWithAudit: (input: {
    adminId: string;
    targetUserId: string;
    oldStatus: string;
    newStatus: UserStatus;
    protectLastAdmin: boolean;
    protectSelfBlock: boolean;
  }) =>
    prisma.$transaction(async (tx) => {
      if (input.protectSelfBlock) {
        throw new Error("ADMIN_SELF_BLOCK");
      }

      if (input.protectLastAdmin) {
        const activeAdmins = await tx.user.count({ where: activeAdminWhere });
        if (activeAdmins <= 1) {
          throw new Error("LAST_ACTIVE_ADMIN");
        }
      }

      const user = await tx.user.update({
        where: { id: input.targetUserId },
        data: { status: input.newStatus },
        include: userInclude,
      });

      await tx.auditLog.create({
        data: {
          adminId: input.adminId,
          action: "UPDATE_USER_STATUS",
          details: JSON.stringify({
            targetUserId: input.targetUserId,
            oldValue: input.oldStatus,
            newValue: input.newStatus,
          }),
        },
      });

      return user;
    }),
};
