import { Router } from "express";
import { authenticate } from "../../common/middleware/authenticate.middleware";
import { authorizePermission } from "../../common/middleware/authorize-permission.middleware";
import { validate } from "../../common/middleware/validate.middleware";
import { Permissions } from "../../constants/permissions";
import * as controller from "./admin-swap-transaction.controller";
import { adminSwapListQuerySchema, adminSwapParamsSchema } from "./admin-swap-transaction.validation";

export const adminSwapTransactionRouter = Router();
adminSwapTransactionRouter.use(authenticate, authorizePermission(Permissions.SWAPS_READ_ANY));
adminSwapTransactionRouter.get("/", validate({ query: adminSwapListQuerySchema }), controller.list);
adminSwapTransactionRouter.get("/:transactionId", validate({ params: adminSwapParamsSchema }), controller.detail);
