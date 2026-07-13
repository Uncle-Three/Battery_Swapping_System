import { Router } from "express";
import { swapController } from "./swap.controller";
import { authenticate } from "../../common/middleware/authenticate.middleware";
import { authorizePermission } from "../../common/middleware/authorize-permission.middleware";
import { Permissions } from "../../constants/permissions";

export const swapRouter = Router();

swapRouter.use(authenticate);
swapRouter.get("/history", authorizePermission(Permissions.SWAPS_READ_SELF), swapController.history);
