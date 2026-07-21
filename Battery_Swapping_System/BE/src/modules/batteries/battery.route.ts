import { Router } from "express";
import { batteryController } from "./battery.controller";
import { validate } from "../../common/middleware/validate.middleware";
import { objectIdParamsSchema } from "../../common/validation/object-id";
import { authenticate } from "../../common/middleware/authenticate.middleware";
import { authorizePermission } from "../../common/middleware/authorize-permission.middleware";
import { Permissions } from "../../constants/permissions";
import { batteryHealthController } from "../battery-health/battery-health.controller";
import { batteryTelemetrySchema } from "../battery-health/battery-health.validation";

export const batteryRouter = Router();

batteryRouter.get("/", batteryController.list);
batteryRouter.get("/faulty", batteryController.listFaulty);
batteryRouter.get("/:id/health", authenticate, authorizePermission(Permissions.BATTERY_HEALTH_READ), validate({ params: objectIdParamsSchema }), batteryHealthController.getHealth);
batteryRouter.post("/:id/telemetry", authenticate, authorizePermission(Permissions.BATTERY_HEALTH_WRITE), validate({ params: objectIdParamsSchema, body: batteryTelemetrySchema }), batteryHealthController.recordTelemetry);
batteryRouter.get("/:id", validate({ params: objectIdParamsSchema }), batteryController.getById);
