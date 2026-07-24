import { Router } from "express";
import { batteryController } from "./battery.controller";
import { validate } from "../../common/middleware/validate.middleware";
import { objectIdParamsSchema } from "../../common/validation/object-id";
import { authenticate } from "../../common/middleware/authenticate.middleware";
import { authorizePermission } from "../../common/middleware/authorize-permission.middleware";
import { authorize } from "../../common/middleware/authorize.middleware";
import { Permissions } from "../../constants/permissions";
import { Roles } from "../../constants/roles";
import { batteryHealthController } from "../battery-health/battery-health.controller";
import { batteryTelemetrySchema } from "../battery-health/battery-health.validation";
import { createBatterySchema } from "./battery.validation";
import { createBatteryRateLimiter } from "../../common/middleware/rate-limit.middleware";

export const batteryRouter = Router();

batteryRouter.get("/", batteryController.list);
batteryRouter.get("/faulty", batteryController.listFaulty);

batteryRouter.post(
  "/",
  authenticate,
  authorize(Roles.ADMIN, Roles.MANAGER, Roles.STAFF),
  createBatteryRateLimiter,
  validate({ body: createBatterySchema }),
  batteryController.create
);

batteryRouter.get(
  "/:id/health",
  authenticate,
  authorizePermission(Permissions.BATTERY_HEALTH_READ),
  validate({ params: objectIdParamsSchema }),
  batteryHealthController.getHealth
);

batteryRouter.post(
  "/:id/telemetry",
  authenticate,
  authorizePermission(Permissions.BATTERY_HEALTH_WRITE),
  validate({ params: objectIdParamsSchema, body: batteryTelemetrySchema }),
  batteryHealthController.recordTelemetry
);

batteryRouter.get("/:id", validate({ params: objectIdParamsSchema }), batteryController.getById);
