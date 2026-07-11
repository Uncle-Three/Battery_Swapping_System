import { Router } from "express";
import { authRouter } from "../modules/auth/auth.route";
import { userRouter } from "../modules/users/user.route";
import { stationRouter } from "../modules/stations/station.route";
import { batteryRouter } from "../modules/batteries/battery.route";
import { batterySlotRouter } from "../modules/battery-slots/battery-slot.route";
import { bookingRouter } from "../modules/bookings/booking.route";
import { swapRouter } from "../modules/swaps/swap.route";
import { maintenanceRouter } from "../modules/maintenance/maintenance.route";
import { paymentRouter } from "../modules/payments/payment.route";
import { reportRouter } from "../modules/reports/report.route";
import { adminRouter } from "../modules/admin/admin.route";

export const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/users", userRouter);
apiRouter.use("/stations", stationRouter);
apiRouter.use("/batteries", batteryRouter);
apiRouter.use("/battery-slots", batterySlotRouter);
apiRouter.use("/bookings", bookingRouter);
apiRouter.use("/swaps", swapRouter);
apiRouter.use("/maintenance", maintenanceRouter);
apiRouter.use("/payments", paymentRouter);
apiRouter.use("/reports", reportRouter);
apiRouter.use("/admin", adminRouter);

