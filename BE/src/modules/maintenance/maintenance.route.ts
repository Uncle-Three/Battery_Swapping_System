import { Router } from "express";
import { maintenanceController } from "./maintenance.controller";
import { authenticate } from "../../common/middleware/authenticate.middleware";
import { validate } from "../../common/middleware/validate.middleware";
import { createMaintenanceRecordSchema } from "./maintenance.validation";
import { authorizePermission } from "../../common/middleware/authorize-permission.middleware";
import { Permissions } from "../../constants/permissions";

export const maintenanceRouter = Router();

maintenanceRouter.use(authenticate);
maintenanceRouter.post("/", authorizePermission(Permissions.MAINTENANCE_CREATE), validate({ body: createMaintenanceRecordSchema }), maintenanceController.create);
maintenanceRouter.get("/", authorizePermission(Permissions.MAINTENANCE_READ), maintenanceController.list);
