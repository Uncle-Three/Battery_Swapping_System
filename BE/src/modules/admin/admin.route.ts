import { Router } from "express";
import { adminController } from "./admin.controller";
import { authenticate } from "../../common/middleware/authenticate.middleware";
import { authorizePermission } from "../../common/middleware/authorize-permission.middleware";
import { Permissions } from "../../constants/permissions";
import { validate } from "../../common/middleware/validate.middleware";
import { adminUserParamsSchema, updateAdminUserRoleSchema, updateAdminUserStatusSchema } from "./admin.validation";

export const adminRouter = Router();

adminRouter.use(authenticate);
adminRouter.get("/overview", authorizePermission(Permissions.SETTINGS_MANAGE), adminController.overview);
adminRouter.get("/audit-logs", authorizePermission(Permissions.AUDIT_LOGS_READ), adminController.auditLogs);
adminRouter.get("/users", authorizePermission(Permissions.USERS_READ_ANY), adminController.listUsers);
adminRouter.get("/roles", authorizePermission(Permissions.USERS_READ_ANY), adminController.listRoles);
adminRouter.get("/permissions", authorizePermission(Permissions.USERS_READ_ANY), adminController.listPermissions);
adminRouter.patch(
  "/users/:id/role",
  authorizePermission(Permissions.USERS_UPDATE_ROLE),
  validate({ params: adminUserParamsSchema, body: updateAdminUserRoleSchema }),
  adminController.updateUserRole,
);
adminRouter.patch(
  "/users/:id/status",
  authorizePermission(Permissions.USERS_UPDATE_STATUS),
  validate({ params: adminUserParamsSchema, body: updateAdminUserStatusSchema }),
  adminController.updateUserStatus,
);
