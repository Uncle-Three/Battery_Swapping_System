import { Router } from "express";
import { reportController } from "./report.controller";
import { authenticate } from "../../common/middleware/authenticate.middleware";
import { authorizePermission } from "../../common/middleware/authorize-permission.middleware";
import { Permissions } from "../../constants/permissions";
import { validate } from "../../common/middleware/validate.middleware";
import { analyticsQuerySchema } from "./report.validation";

export const reportRouter = Router();

reportRouter.use(authenticate);
reportRouter.get("/analytics", authorizePermission(Permissions.REPORTS_READ), validate({ query: analyticsQuerySchema }), reportController.analytics);
reportRouter.get("/inventory", authorizePermission(Permissions.INVENTORY_READ), reportController.inventory);
