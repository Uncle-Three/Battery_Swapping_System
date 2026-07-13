import { Router } from "express";
import { adminController } from "./admin.controller";
import { authenticate } from "../../common/middleware/authenticate.middleware";
import { authorizePermission } from "../../common/middleware/authorize-permission.middleware";
import { Permissions } from "../../constants/permissions";
import { validate } from "../../common/middleware/validate.middleware";
import { adminUserParamsSchema, systemSettingParamsSchema, updateAdminUserRoleSchema, updateAdminUserStatusSchema, updateSystemSettingSchema, auditLogsQuerySchema } from "./admin.validation";

import { auditLogMiddleware } from "../../common/middleware/audit.middleware";

export const adminRouter = Router();

adminRouter.use(authenticate);
adminRouter.use(auditLogMiddleware);
adminRouter.get("/overview", authorizePermission(Permissions.SETTINGS_MANAGE), adminController.overview);
adminRouter.get("/audit-logs", authorizePermission(Permissions.AUDIT_LOGS_READ), validate({ query: auditLogsQuerySchema }), adminController.auditLogs);
adminRouter.get("/settings", authorizePermission(Permissions.SETTINGS_MANAGE), adminController.settings);
adminRouter.put("/settings/:key", authorizePermission(Permissions.SETTINGS_MANAGE), validate({ params: systemSettingParamsSchema, body: updateSystemSettingSchema }), adminController.updateSetting);
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

import { stationController } from "../stations/station.controller";
import { createStationSchema, updateStationSchema } from "../stations/station.validation";
import { objectIdParamsSchema } from "../../common/validation/object-id";
import { stationDetailRouter } from "../station-detail/station-detail.route";

adminRouter.get("/stations", authorizePermission(Permissions.SETTINGS_MANAGE), stationController.listAllForAdmin);
adminRouter.use("/stations/:stationId", stationDetailRouter);
adminRouter.post("/stations", authorizePermission(Permissions.SETTINGS_MANAGE), validate({ body: createStationSchema }), stationController.create);
adminRouter.put("/stations/:id", authorizePermission(Permissions.SETTINGS_MANAGE), validate({ params: objectIdParamsSchema, body: updateStationSchema }), stationController.update);
adminRouter.delete("/stations/:id", authorizePermission(Permissions.SETTINGS_MANAGE), validate({ params: objectIdParamsSchema }), stationController.delete);

import { vehicleModelController } from "../vehicle-models/vehicle-model.controller";
import { createVehicleModelSchema, updateVehicleModelSchema } from "../vehicle-models/vehicle-model.validation";

adminRouter.get("/vehicle-models", authorizePermission(Permissions.SETTINGS_MANAGE), vehicleModelController.list);
adminRouter.post("/vehicle-models", authorizePermission(Permissions.SETTINGS_MANAGE), validate({ body: createVehicleModelSchema }), vehicleModelController.create);
adminRouter.put("/vehicle-models/:id", authorizePermission(Permissions.SETTINGS_MANAGE), validate({ params: objectIdParamsSchema, body: updateVehicleModelSchema }), vehicleModelController.update);
adminRouter.delete("/vehicle-models/:id", authorizePermission(Permissions.SETTINGS_MANAGE), validate({ params: objectIdParamsSchema }), vehicleModelController.delete);

import { batteryTypeController } from "../battery-types/battery-type.controller";
import { createBatteryTypeSchema, updateBatteryTypeSchema } from "../battery-types/battery-type.validation";

adminRouter.get("/battery-types", authorizePermission(Permissions.SETTINGS_MANAGE), batteryTypeController.list);
adminRouter.post("/battery-types", authorizePermission(Permissions.SETTINGS_MANAGE), validate({ body: createBatteryTypeSchema }), batteryTypeController.create);
adminRouter.put("/battery-types/:id", authorizePermission(Permissions.SETTINGS_MANAGE), validate({ params: objectIdParamsSchema, body: updateBatteryTypeSchema }), batteryTypeController.update);
adminRouter.delete("/battery-types/:id", authorizePermission(Permissions.SETTINGS_MANAGE), validate({ params: objectIdParamsSchema }), batteryTypeController.delete);

import { compatibilityController } from "../compatibilities/compatibility.controller";
import { createCompatibilitySchema, updateCompatibilitySchema } from "../compatibilities/compatibility.validation";

adminRouter.get("/compatibilities", authorizePermission(Permissions.SETTINGS_MANAGE), compatibilityController.list);
adminRouter.post("/compatibilities", authorizePermission(Permissions.SETTINGS_MANAGE), validate({ body: createCompatibilitySchema }), compatibilityController.create);
adminRouter.put("/compatibilities/:id", authorizePermission(Permissions.SETTINGS_MANAGE), validate({ params: objectIdParamsSchema, body: updateCompatibilitySchema }), compatibilityController.update);
adminRouter.delete("/compatibilities/:id", authorizePermission(Permissions.SETTINGS_MANAGE), validate({ params: objectIdParamsSchema }), compatibilityController.delete);

import { safetyRuleController } from "../safety-rules/safety-rule.controller";
import { createSafetyRuleSchema, updateSafetyRuleSchema } from "../safety-rules/safety-rule.validation";

adminRouter.get("/safety-rules", authorizePermission(Permissions.SETTINGS_MANAGE), safetyRuleController.list);
adminRouter.post("/safety-rules", authorizePermission(Permissions.SETTINGS_MANAGE), validate({ body: createSafetyRuleSchema }), safetyRuleController.create);
adminRouter.put("/safety-rules/:id", authorizePermission(Permissions.SETTINGS_MANAGE), validate({ params: objectIdParamsSchema, body: updateSafetyRuleSchema }), safetyRuleController.update);
adminRouter.delete("/safety-rules/:id", authorizePermission(Permissions.SETTINGS_MANAGE), validate({ params: objectIdParamsSchema }), safetyRuleController.delete);
