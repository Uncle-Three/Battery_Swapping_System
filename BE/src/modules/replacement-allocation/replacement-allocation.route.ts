import { Router } from "express";
import { authenticate } from "../../common/middleware/authenticate.middleware";
import { validate } from "../../common/middleware/validate.middleware";
import { replacementAllocationController } from "./replacement-allocation.controller";
import {
  reserveReplacementSchema,
  verifyQrSchema,
  reportShortageSchema,
  replacementSwapParamsSchema,
} from "./replacement-allocation.validation";

export const replacementAllocationRouter = Router({ mergeParams: true });

replacementAllocationRouter.use(authenticate);

// Candidates list
replacementAllocationRouter.get(
  "/:swapId/replacement-battery/candidates",
  validate({ params: replacementSwapParamsSchema }),
  replacementAllocationController.getCandidates
);

// Status restoration
replacementAllocationRouter.get(
  "/:swapId/replacement-battery/status",
  validate({ params: replacementSwapParamsSchema }),
  replacementAllocationController.getStatus
);

// Reserve battery
replacementAllocationRouter.post(
  "/:swapId/replacement-battery/reserve",
  validate({ params: replacementSwapParamsSchema, body: reserveReplacementSchema }),
  replacementAllocationController.reserve
);

// Cancel reservation
replacementAllocationRouter.delete(
  "/:swapId/replacement-battery/reservation",
  validate({ params: replacementSwapParamsSchema }),
  replacementAllocationController.cancelReservation
);

// Verify QR
replacementAllocationRouter.post(
  "/:swapId/replacement-battery/verify",
  validate({ params: replacementSwapParamsSchema, body: verifyQrSchema }),
  replacementAllocationController.verifyQr
);

// Install battery
replacementAllocationRouter.post(
  "/:swapId/replacement-battery/install",
  validate({ params: replacementSwapParamsSchema }),
  replacementAllocationController.install
);

// Report shortage
replacementAllocationRouter.post(
  "/:swapId/replacement-battery/report-shortage",
  validate({ params: replacementSwapParamsSchema, body: reportShortageSchema }),
  replacementAllocationController.reportShortage
);
