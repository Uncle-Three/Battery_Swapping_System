import { z } from "zod";
import { UserStatus } from "@prisma/client";
import { Roles } from "../../constants/roles";

export const updateSystemSettingSchema = z.object({
  key: z.string().min(1),
  value: z.string().min(1),
});

export const adminUserParamsSchema = z.object({
  id: z.string().min(1),
});

export const updateAdminUserRoleSchema = z
  .object({
    role: z.enum([Roles.MEMBER, Roles.STAFF, Roles.TECHNICIAN, Roles.MANAGER, Roles.ADMIN]),
  })
  .strict();

export const updateAdminUserStatusSchema = z
  .object({
    status: z.enum([UserStatus.ACTIVE, UserStatus.INACTIVE, UserStatus.BLOCKED]),
  })
  .strict();
