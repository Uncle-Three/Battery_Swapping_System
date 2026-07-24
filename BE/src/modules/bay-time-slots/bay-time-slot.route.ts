import { Router } from "express";
import { validate } from "../../common/middleware/validate.middleware";
import { bayTimeSlotController as controller } from "./bay-time-slot.controller";
import * as schema from "./bay-time-slot.validation";

export const bayTimeSlotAdminRouter = Router();

bayTimeSlotAdminRouter.patch("/bay-slots/bulk-status", validate({ body: schema.bulkStatusSchema }), controller.updateBulkStatus);
bayTimeSlotAdminRouter.patch("/bay-slots/:slotId/status", validate({ params: schema.slotParamSchema, body: schema.statusSchema }), controller.updateStatus);
bayTimeSlotAdminRouter.delete("/bay-slots/:slotId", validate({ params: schema.slotParamSchema }), controller.remove);
bayTimeSlotAdminRouter.post("/bays/:bayId/slots", validate({ params: schema.bayParamSchema, body: schema.createSingleSchema }), controller.createSingle);
bayTimeSlotAdminRouter.get("/stations/:stationId/bay-slots", validate({ params: schema.stationParamSchema, query: schema.listSchema }), controller.list);
bayTimeSlotAdminRouter.post("/stations/:stationId/bay-slots/bulk", validate({ params: schema.stationParamSchema, body: schema.bulkCreateSchema }), controller.createBulk);
