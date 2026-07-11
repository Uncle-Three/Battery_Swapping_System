import { Router } from "express";
import { paymentController } from "./payment.controller";
import { authenticate } from "../../common/middleware/authenticate.middleware";

export const paymentRouter = Router();

paymentRouter.use(authenticate);
paymentRouter.get("/wallet", paymentController.getWallet);
paymentRouter.post("/wallet/topups", paymentController.createTopup);
paymentRouter.post("/subscriptions/purchase", paymentController.purchaseSubscription);

