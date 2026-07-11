import { Router } from "express";
import { bookingController } from "./booking.controller";
import { authenticate } from "../../common/middleware/authenticate.middleware";
import { validate } from "../../common/middleware/validate.middleware";
import { createBookingSchema } from "./booking.validation";

export const bookingRouter = Router();

bookingRouter.use(authenticate);
bookingRouter.get("/active", bookingController.getActive);
bookingRouter.post("/", validate({ body: createBookingSchema }), bookingController.create);
bookingRouter.get("/:id", bookingController.getById);
bookingRouter.post("/:id/cancel", bookingController.cancel);

