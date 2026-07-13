import { Router } from "express";
import { bookingController } from "./booking.controller";
import { authenticate } from "../../common/middleware/authenticate.middleware";
import { validate } from "../../common/middleware/validate.middleware";
import { createBookingSchema } from "./booking.validation";
import { objectIdParamsSchema } from "../../common/validation/object-id";
import { authorizePermission } from "../../common/middleware/authorize-permission.middleware";
import { Permissions } from "../../constants/permissions";

export const bookingRouter = Router();

bookingRouter.use(authenticate);
bookingRouter.get("/", authorizePermission(Permissions.BOOKINGS_READ_SELF), bookingController.getAll);
bookingRouter.get("/active", authorizePermission(Permissions.BOOKINGS_READ_SELF), bookingController.getActive);
bookingRouter.post("/quote", authorizePermission(Permissions.BOOKINGS_CREATE), validate({ body: createBookingSchema }), bookingController.quote);
bookingRouter.post("/", authorizePermission(Permissions.BOOKINGS_CREATE), validate({ body: createBookingSchema }), bookingController.create);
bookingRouter.get("/:id", authorizePermission(Permissions.BOOKINGS_READ_SELF), validate({ params: objectIdParamsSchema }), bookingController.getById);
bookingRouter.post("/:id/cancel", authorizePermission(Permissions.BOOKINGS_CANCEL_SELF), validate({ params: objectIdParamsSchema }), bookingController.cancel);
bookingRouter.post("/:id/confirm-reschedule", authorizePermission(Permissions.BOOKINGS_CREATE), validate({ params: objectIdParamsSchema }), bookingController.confirmReschedule);
