import { Router } from "express";
import { authenticate } from "../../common/middleware/authenticate.middleware";
import { authorizePermission } from "../../common/middleware/authorize-permission.middleware";
import { Permissions } from "../../constants/permissions";
import { replacementRequestController } from "./replacement-request.controller";

export const replacementRequestRouter = Router();
replacementRequestRouter.use(authenticate, authorizePermission(Permissions.REPLACEMENTS_READ_SELF));
replacementRequestRouter.get("/me", replacementRequestController.listMine);
