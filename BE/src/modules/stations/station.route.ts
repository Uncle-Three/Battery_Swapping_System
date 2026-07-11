import { Router } from "express";
import { stationController } from "./station.controller";

export const stationRouter = Router();

stationRouter.get("/", stationController.list);
stationRouter.get("/:id", stationController.getById);
stationRouter.get("/:id/slots", stationController.getSlots);

