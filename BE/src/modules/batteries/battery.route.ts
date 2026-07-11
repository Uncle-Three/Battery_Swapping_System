import { Router } from "express";
import { batteryController } from "./battery.controller";

export const batteryRouter = Router();

batteryRouter.get("/", batteryController.list);
batteryRouter.get("/faulty", batteryController.listFaulty);
batteryRouter.get("/:id", batteryController.getById);

