import { Router } from "express";
import { userController } from "./user.controller";
import { authenticate } from "../../common/middleware/authenticate.middleware";
import { validate } from "../../common/middleware/validate.middleware";
import { updateMeSchema } from "./user.validation";

export const userRouter = Router();

userRouter.use(authenticate);
userRouter.get("/me", userController.getMe);
userRouter.patch("/me", validate({ body: updateMeSchema }), userController.updateMe);
