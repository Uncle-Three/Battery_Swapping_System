import { Router } from "express";
import { vehicleModelController } from "./vehicle-model.controller";
import { validate } from "../../common/middleware/validate.middleware";
import { objectIdParamsSchema } from "../../common/validation/object-id";
import { authenticate } from "../../common/middleware/authenticate.middleware";
import { authorize } from "../../common/middleware/authorize.middleware";
import { Roles } from "../../constants/roles";
import { createVehicleModelSchema, updateVehicleModelSchema } from "./vehicle-model.validation";

export const vehicleModelRouter = Router();

vehicleModelRouter.get("/", vehicleModelController.list);
vehicleModelRouter.get("/:id", validate({ params: objectIdParamsSchema }), vehicleModelController.getById);
vehicleModelRouter.post("/", authenticate, authorize(Roles.ADMIN), validate({ body: createVehicleModelSchema }), vehicleModelController.create);
vehicleModelRouter.put("/:id", authenticate, authorize(Roles.ADMIN), validate({ params: objectIdParamsSchema, body: updateVehicleModelSchema }), vehicleModelController.update);
vehicleModelRouter.delete("/:id", authenticate, authorize(Roles.ADMIN), validate({ params: objectIdParamsSchema }), vehicleModelController.delete);
