import { Router } from "express";
import { userController } from "./user.controller";
import { authenticate } from "../../common/middleware/authenticate.middleware";
import { validate } from "../../common/middleware/validate.middleware";
import { objectIdParamsSchema } from "../../common/validation/object-id";
import { updateMeSchema } from "./user.validation";

export const userRouter = Router();

userRouter.use(authenticate);
userRouter.get("/me", userController.getMe);
userRouter.get("/me/vehicles", userController.getMyVehicles);
userRouter.get("/me/dashboard", userController.getDashboard);
userRouter.get("/me/vehicles/:id", validate({ params: objectIdParamsSchema }), userController.getMyVehicleDetail);
userRouter.patch("/me", validate({ body: updateMeSchema }), userController.updateMe);
