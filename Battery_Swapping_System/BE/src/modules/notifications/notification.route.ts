import { Router } from "express";
import { authenticate } from "../../common/middleware/authenticate.middleware";
import { authorizePermission } from "../../common/middleware/authorize-permission.middleware";
import { validate } from "../../common/middleware/validate.middleware";
import { objectIdParamsSchema } from "../../common/validation/object-id";
import { Permissions } from "../../constants/permissions";
import { notificationController } from "./notification.controller";

export const notificationRouter = Router();
notificationRouter.use(authenticate, authorizePermission(Permissions.NOTIFICATIONS_READ_SELF));
notificationRouter.get("/", notificationController.listMine);
notificationRouter.patch("/:id/read", validate({ params: objectIdParamsSchema }), notificationController.markRead);
