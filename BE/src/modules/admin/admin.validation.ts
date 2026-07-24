import { z } from "zod";
import { UserStatus } from "@prisma/client";
import { Roles } from "../../constants/roles";
import { objectIdSchema } from "../../common/validation/object-id";

export const updateSystemSettingSchema = z.object({
  value: z.string().min(1),
}).strict();
export const systemSettingParamsSchema = z.object({ key: z.string().regex(/^[a-z][a-z0-9_.-]{1,99}$/i) });

export const adminUserParamsSchema = z.object({
  id: objectIdSchema,
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

export const auditLogsQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  offset: z.coerce.number().min(0).optional().default(0),
  action: z.string().optional(),
});

