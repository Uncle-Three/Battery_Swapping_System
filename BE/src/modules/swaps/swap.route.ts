import { Router } from "express";
import { swapController } from "./swap.controller";
import { authenticate } from "../../common/middleware/authenticate.middleware";
import { validate } from "../../common/middleware/validate.middleware";
import { initiateSwapSchema, processSwapSchema } from "./swap.validation";

export const swapRouter = Router();

swapRouter.use(authenticate);
swapRouter.post("/initiate", validate({ body: initiateSwapSchema }), swapController.initiate);
swapRouter.post("/process", validate({ body: processSwapSchema }), swapController.process);
swapRouter.get("/history", swapController.history);

