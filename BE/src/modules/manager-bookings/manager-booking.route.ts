import { Router } from "express";
import { authenticate } from "../../common/middleware/authenticate.middleware";
import { authorizePermission } from "../../common/middleware/authorize-permission.middleware";
import { validate } from "../../common/middleware/validate.middleware";
import { objectIdParamsSchema } from "../../common/validation/object-id";
import { Permissions } from "../../constants/permissions";
import { managerBookingController } from "./manager-booking.controller";
import { proposeRescheduleSchema, rejectBookingSchema } from "./manager-booking.validation";

export const managerBookingRouter = Router();
managerBookingRouter.use(authenticate, authorizePermission(Permissions.BOOKINGS_APPROVE));
managerBookingRouter.get("/pending", managerBookingController.pending);
managerBookingRouter.get("/history", managerBookingController.history);
managerBookingRouter.get("/:id", validate({ params: objectIdParamsSchema }), managerBookingController.getById);
managerBookingRouter.post("/:id/approve", validate({ params: objectIdParamsSchema }), managerBookingController.approve);
managerBookingRouter.post("/:id/reject", validate({ params: objectIdParamsSchema, body: rejectBookingSchema }), managerBookingController.reject);
managerBookingRouter.post("/:id/reschedule", validate({ params: objectIdParamsSchema, body: proposeRescheduleSchema }), managerBookingController.reschedule);
