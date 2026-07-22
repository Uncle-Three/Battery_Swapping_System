import { Router } from "express";
import { batterySlotController } from "./battery-slot.controller";
import { validate } from "../../common/middleware/validate.middleware";
import { objectIdParamsSchema } from "../../common/validation/object-id";

export const batterySlotRouter = Router();

batterySlotRouter.get("/", batterySlotController.list);
batterySlotRouter.get("/:id", validate({ params: objectIdParamsSchema }), batterySlotController.getById);
