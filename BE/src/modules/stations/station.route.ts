import { Router } from "express";
import { stationController } from "./station.controller";
import { validate } from "../../common/middleware/validate.middleware";
import { objectIdParamsSchema } from "../../common/validation/object-id";
import { authenticate } from "../../common/middleware/authenticate.middleware";
import { bookingScheduleSchema, stationAvailabilitySchema } from "./station.validation";
import { bayTimeSlotController } from "../bay-time-slots/bay-time-slot.controller";
import { availableQuerySchema } from "../bay-time-slots/bay-time-slot.validation";

export const stationRouter = Router();

stationRouter.get("/", stationController.list);
stationRouter.get("/:id/availability", authenticate, validate({ params: objectIdParamsSchema, query: stationAvailabilitySchema }), stationController.availability);
stationRouter.get("/:id/booking-schedule", authenticate, validate({ params: objectIdParamsSchema, query: bookingScheduleSchema }), stationController.bookingSchedule);
stationRouter.get("/:id/available-bay-slots", validate({ params: objectIdParamsSchema, query: availableQuerySchema }), bayTimeSlotController.available);
stationRouter.get("/:id/available-time-slots", validate({ params: objectIdParamsSchema, query: availableQuerySchema }), bayTimeSlotController.groupedAvailability);
stationRouter.get("/:id/available-booking-dates", validate({ params: objectIdParamsSchema }), bayTimeSlotController.availableDates);
stationRouter.get("/:id", validate({ params: objectIdParamsSchema }), stationController.getById);
stationRouter.get("/:id/slots", validate({ params: objectIdParamsSchema }), stationController.getSlots);
