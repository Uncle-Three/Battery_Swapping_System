import { Router } from "express";
import { validate } from "../../common/middleware/validate.middleware";
import { authenticate } from "../../common/middleware/authenticate.middleware";
import { authorize } from "../../common/middleware/authorize.middleware";
import * as vehicleController from "./vehicle.controller";
import * as vehicleSchema from "./vehicle.schema";

const router = Router();

// All vehicle routes require authentication and MEMBER role
router.use(authenticate);
router.use(authorize("MEMBER"));

router.get("/", validate({ query: vehicleSchema.vehicleListQuerySchema }), vehicleController.getMyVehicles);

router.get("/:vehicleId", validate({ params: vehicleSchema.vehicleIdParamsSchema }), vehicleController.getVehicleById);

router.post(
  "/",
  validate(vehicleSchema.createVehicleSchema),
  vehicleController.createVehicle
);

router.patch(
  "/:vehicleId",
  validate({ params: vehicleSchema.vehicleIdParamsSchema, ...vehicleSchema.updateVehicleSchema }),
  vehicleController.updateVehicle
);

router.patch(
  "/:vehicleId/mileage",
  validate({ params: vehicleSchema.vehicleIdParamsSchema, ...vehicleSchema.updateMileageSchema }),
  vehicleController.updateMileage
);

router.delete("/:vehicleId", validate({ params: vehicleSchema.vehicleIdParamsSchema }), vehicleController.deleteVehicle);

router.get("/:vehicleId/battery-history", validate({ params: vehicleSchema.vehicleIdParamsSchema, query: vehicleSchema.vehicleHistoryQuerySchema }), vehicleController.getBatteryHistory);

router.get("/:vehicleId/mileage-history", validate({ params: vehicleSchema.vehicleIdParamsSchema, query: vehicleSchema.vehicleHistoryQuerySchema }), vehicleController.getMileageHistory);

router.get("/:vehicleId/battery-qr", validate({ params: vehicleSchema.vehicleIdParamsSchema }), vehicleController.getBatteryQr);

router.get("/:vehicleId/swap-eligibility", validate({ params: vehicleSchema.vehicleIdParamsSchema }), vehicleController.checkSwapEligibility);

export { router as vehicleRouter };
