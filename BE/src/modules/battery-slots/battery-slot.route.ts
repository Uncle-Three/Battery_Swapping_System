import { Router } from "express";
import { batterySlotController } from "./battery-slot.controller";

export const batterySlotRouter = Router();

batterySlotRouter.get("/", batterySlotController.list);
batterySlotRouter.get("/:id", batterySlotController.getById);

