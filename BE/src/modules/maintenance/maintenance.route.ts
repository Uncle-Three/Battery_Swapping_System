import { Router } from "express";
import { maintenanceController } from "./maintenance.controller";
import { authenticate } from "../../common/middleware/authenticate.middleware";
import { validate } from "../../common/middleware/validate.middleware";
import { createMaintenanceRecordSchema } from "./maintenance.validation";

export const maintenanceRouter = Router();

maintenanceRouter.use(authenticate);
maintenanceRouter.post("/", validate({ body: createMaintenanceRecordSchema }), maintenanceController.create);
maintenanceRouter.get("/", maintenanceController.list);

