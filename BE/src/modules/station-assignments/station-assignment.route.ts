import { Router } from "express";
import { authenticate } from "../../common/middleware/authenticate.middleware";
import { authorizePermission } from "../../common/middleware/authorize-permission.middleware";
import { validate } from "../../common/middleware/validate.middleware";
import { Permissions } from "../../constants/permissions";
import { stationAssignmentController } from "./station-assignment.controller";
import { createStationAssignmentSchema, stationAssignmentParamsSchema } from "./station-assignment.validation";

export const stationAssignmentRouter = Router();
stationAssignmentRouter.use(authenticate, authorizePermission(Permissions.STATION_ASSIGNMENTS_MANAGE));
stationAssignmentRouter.get("/", stationAssignmentController.list);
stationAssignmentRouter.post("/", validate({ body: createStationAssignmentSchema }), stationAssignmentController.create);
stationAssignmentRouter.delete("/:id", validate({ params: stationAssignmentParamsSchema }), stationAssignmentController.deactivate);
