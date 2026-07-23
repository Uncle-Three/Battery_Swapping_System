import { Router } from "express";
import { authenticate } from "../../common/middleware/authenticate.middleware";
import { technicalHistoryController } from "./technical-history.controller";

export const technicalHistoryRouter = Router({ mergeParams: true });

/**
 * @swagger
 * /vehicles/{vehicleId}/technical-history:
 *   get:
 *     summary: Get sanitized technical history of a vehicle
 *     description: Returns swap transactions, battery history, maintenance records and health logs. Payment data is excluded.
 *     tags: [Vehicle Technical History]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: vehicleId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Vehicle technical history
 */
technicalHistoryRouter.get("/", authenticate, technicalHistoryController.getVehicleTechnicalHistory);
