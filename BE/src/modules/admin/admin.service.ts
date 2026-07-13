import { auditLogService } from "../audit-logs/audit-log.service";
import { adminRepository } from "./admin.repository";
import { userMapper } from "../users/user.mapper";
import { NotFoundError } from "../../common/errors/not-found-error";
import { BadRequestError } from "../../common/errors/bad-request-error";
import { ForbiddenError } from "../../common/errors/forbidden-error";
import { Roles, type Role } from "../../constants/roles";
import { RolePermissions } from "../../constants/permissions";
import { UserStatus } from "@prisma/client";

type AdminRepository = typeof adminRepository;

type AdminServiceDependencies = {
  repository: Pick<
    AdminRepository,
    | "findUsers"
    | "findUserById"
    | "findRoleByName"
    | "countActiveAdmins"
    | "findSettings"
    | "upsertSettingWithAudit"
    | "updateUserRoleWithAudit"
    | "updateUserStatusWithAudit"
  >;
};

export const createAdminService = (dependencies: AdminServiceDependencies) => ({
  overview: async () => ({ status: "ok" }),
  auditLogs: (params?: { limit?: number; offset?: number; action?: string }) => auditLogService.list(params),
  settings: () => dependencies.repository.findSettings(),
  updateSetting: (adminId: string, key: string, value: string) => dependencies.repository.upsertSettingWithAudit(adminId, key, value),

  listUsers: async () => {
    const users = await dependencies.repository.findUsers();
    return users.map(userMapper.toResponse);
  },

  listRoles: async () => Object.values(Roles),

  listPermissions: async () => RolePermissions,

  updateUserRole: async (adminId: string, targetUserId: string, role: Role) => {
    const targetUser = await dependencies.repository.findUserById(targetUserId);
    if (!targetUser) {
      throw new NotFoundError("Target user not found");
    }

    const targetRole = await dependencies.repository.findRoleByName(role);
    if (!targetRole) {
      throw new NotFoundError("Role not found");
    }

    if (targetUser.role.name === role) {
      throw new BadRequestError("Role is unchanged");
    }

    if (targetUser.role.name === Roles.ADMIN && role !== Roles.ADMIN) {
      if (adminId === targetUserId) {
        throw new ForbiddenError("Admin cannot demote themselves");
      }

      const activeAdmins = await dependencies.repository.countActiveAdmins();
      if (activeAdmins <= 1) {
        throw new ForbiddenError("Cannot demote the last active admin");
      }
    }

    try {
      const user = await dependencies.repository.updateUserRoleWithAudit({
        adminId,
        targetUserId,
        roleId: targetRole.id,
        oldRole: targetUser.role.name,
        newRole: role,
        protectLastAdmin: targetUser.role.name === Roles.ADMIN && role !== Roles.ADMIN,
        protectSelfDemotion: targetUser.role.name === Roles.ADMIN && role !== Roles.ADMIN && adminId === targetUserId,
      });

      return userMapper.toResponse(user);
    } catch (error) {
      if (error instanceof Error && error.message === "LAST_ACTIVE_ADMIN") {
        throw new ForbiddenError("Cannot demote the last active admin");
      }

      if (error instanceof Error && error.message === "ADMIN_SELF_DEMOTION") {
        throw new ForbiddenError("Admin cannot demote themselves");
      }

      throw error;
    }
  },

  updateUserStatus: async (adminId: string, targetUserId: string, status: UserStatus) => {
    const targetUser = await dependencies.repository.findUserById(targetUserId);
    if (!targetUser) {
      throw new NotFoundError("Target user not found");
    }

    if (targetUser.status === status) {
      throw new BadRequestError("Status is unchanged");
    }

    const isSelfBlock = adminId === targetUserId && status === UserStatus.BLOCKED;
    if (isSelfBlock) {
      throw new ForbiddenError("Admin cannot block themselves");
    }

    const protectsLastAdmin = targetUser.role.name === Roles.ADMIN && status !== UserStatus.ACTIVE;
    if (protectsLastAdmin) {
      const activeAdmins = await dependencies.repository.countActiveAdmins();
      if (activeAdmins <= 1) {
        throw new ForbiddenError("Cannot block or deactivate the last active admin");
      }
    }

    try {
      const user = await dependencies.repository.updateUserStatusWithAudit({
        adminId,
        targetUserId,
        oldStatus: targetUser.status,
        newStatus: status,
        protectLastAdmin: protectsLastAdmin,
        protectSelfBlock: isSelfBlock,
      });

      return userMapper.toResponse(user);
    } catch (error) {
      if (error instanceof Error && error.message === "LAST_ACTIVE_ADMIN") {
        throw new ForbiddenError("Cannot block or deactivate the last active admin");
      }

      if (error instanceof Error && error.message === "ADMIN_SELF_BLOCK") {
        throw new ForbiddenError("Admin cannot block themselves");
      }

      throw error;
    }
  },
});

export const adminService = createAdminService({
  repository: adminRepository,
});
