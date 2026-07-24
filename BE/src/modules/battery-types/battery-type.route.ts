import { Router } from "express";
import { batteryTypeController } from "./battery-type.controller";
import { validate } from "../../common/middleware/validate.middleware";
import { objectIdParamsSchema } from "../../common/validation/object-id";
import { authenticate } from "../../common/middleware/authenticate.middleware";
import { authorize } from "../../common/middleware/authorize.middleware";
import { Roles } from "../../constants/roles";
import { createBatteryTypeSchema, updateBatteryTypeSchema } from "./battery-type.validation";

export const batteryTypeRouter = Router();

batteryTypeRouter.get("/", batteryTypeController.list);
batteryTypeRouter.get("/:id", validate({ params: objectIdParamsSchema }), batteryTypeController.getById);
batteryTypeRouter.post("/", authenticate, authorize(Roles.ADMIN), validate({ body: createBatteryTypeSchema }), batteryTypeController.create);
batteryTypeRouter.put("/:id", authenticate, authorize(Roles.ADMIN), validate({ params: objectIdParamsSchema, body: updateBatteryTypeSchema }), batteryTypeController.update);
batteryTypeRouter.delete("/:id", authenticate, authorize(Roles.ADMIN), validate({ params: objectIdParamsSchema }), batteryTypeController.delete);
