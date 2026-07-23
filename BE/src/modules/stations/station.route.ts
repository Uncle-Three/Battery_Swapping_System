import { Router } from "express";
import { stationController } from "./station.controller";
import { validate } from "../../common/middleware/validate.middleware";
import { objectIdParamsSchema } from "../../common/validation/object-id";
import { authenticate } from "../../common/middleware/authenticate.middleware";
import { bookingScheduleSchema, stationAvailabilitySchema } from "./station.validation";

export const stationRouter = Router();

stationRouter.get("/", stationController.list);
stationRouter.get("/:id/availability", authenticate, validate({ params: objectIdParamsSchema, query: stationAvailabilitySchema }), stationController.availability);
stationRouter.get("/:id/booking-schedule", authenticate, validate({ params: objectIdParamsSchema, query: bookingScheduleSchema }), stationController.bookingSchedule);
stationRouter.get("/:id", validate({ params: objectIdParamsSchema }), stationController.getById);
stationRouter.get("/:id/slots", validate({ params: objectIdParamsSchema }), stationController.getSlots);
