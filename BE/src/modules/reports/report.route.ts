import { Router } from "express";
import { reportController } from "./report.controller";
import { authenticate } from "../../common/middleware/authenticate.middleware";

export const reportRouter = Router();

reportRouter.use(authenticate);
reportRouter.get("/analytics", reportController.analytics);
reportRouter.get("/inventory", reportController.inventory);

