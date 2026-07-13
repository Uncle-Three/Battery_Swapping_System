import { BatteryHealthSource, BatteryOperationalStatus, BookingStatus, InvoiceStatus, NotificationType, PaymentMethod, ReplacementRequestStatus, ReservationStatus, SwapStatus, type Prisma } from "@prisma/client";
import { prisma } from "../../config/database";
import { Roles } from "../../constants/roles";
import { ForbiddenError } from "../../common/errors/forbidden-error";
import { NotFoundError } from "../../common/errors/not-found-error";
import { AppError } from "../../common/errors/app-error";
import { assertBookingTransition, assertSwapTransition } from "../../common/state-machines/transitions";
import { calculateBatterySoh, classifyBatterySoh, inferAccumulatedMileageKm } from "../battery-health/battery-soh";

const assertStaffScope = async (staffId: string, role: string, stationId: string) => {
  if (role === Roles.ADMIN) return;
  const assignments = await prisma.stationAssignment.findMany({
    where: { userId: staffId, assignmentRole: { in: ["STAFF", "MANAGER"] }, active: true },
    select: { stationId: true, assignmentRole: true, effectiveFrom: true, effectiveTo: true },
    orderBy: { effectiveFrom: "desc" },
  });
  const now = new Date();
  const activeAssignments = assignments.filter((assignment) => assignment.effectiveFrom <= now && (!assignment.effectiveTo || assignment.effectiveTo > now));
  const allowed = role === Roles.STAFF
    ? activeAssignments[0]?.stationId === stationId
    : activeAssignments.some((assignment) => assignment.stationId === stationId);
  if (!allowed) throw new ForbiddenError("Staff is not assigned to this station");
};

const nextActions: Record<SwapStatus, string[]> = {
  NOT_STARTED: ["VERIFY"], VERIFIED: ["REMOVE_OLD_BATTERY"], OLD_BATTERY_REMOVED: ["INSPECT_OLD_BATTERY"],
  OLD_BATTERY_INSPECTED: ["ASSIGN_REPLACEMENT"], REPLACEMENT_ASSIGNED: ["INSTALL"], INSTALLED: ["COLLECT_PAYMENT"],
  PAYMENT_PENDING: [], COMPLETED: [], FAILED: ["ROLLBACK"], ROLLED_BACK: [],
};

const getContext = async (staffId: string, role: string) => {
  const stationSelect = {
    id: true, name: true, address: true,
    serviceBays: {
      where: { status: "AVAILABLE" as const },
      select: {
        id: true, bayCode: true, bayName: true, status: true, defaultDurationMinutes: true,
        bookings: {
          where: { status: BookingStatus.APPROVED },
          select: {
            id: true, stationId: true, serviceBayId: true, status: true, scheduledStart: true, scheduledEnd: true,
            mandatory: true, reason: true,
            user: { select: { fullName: true, email: true, phone: true } },
            vehicle: { select: { name: true, plateNumber: true, batteryType: true } },
            battery: { select: { serialNumber: true } },
          },
          orderBy: { scheduledStart: "asc" as const },
        },
      },
      orderBy: { bayCode: "asc" as const },
    },
  };
  if (role === Roles.ADMIN) {
    const stations = await prisma.station.findMany({ where: { status: "ACTIVE" }, select: stationSelect, orderBy: { name: "asc" } });
    return { stations, activeSwap: null };
  }
  const assignments = await prisma.stationAssignment.findMany({
    where: { userId: staffId, assignmentRole: { in: ["STAFF", "MANAGER"] }, active: true },
    select: { stationId: true, effectiveFrom: true, effectiveTo: true },
    orderBy: { effectiveFrom: "desc" },
  });
  const now = new Date();
  const stationIds = [...new Set(assignments
    .filter((item) => item.effectiveFrom <= now && (!item.effectiveTo || item.effectiveTo > now))
    .map((item) => item.stationId))];
  if (role === Roles.STAFF && stationIds.length > 1) stationIds.splice(1);
  
  const stations = await prisma.station.findMany({ where: { id: { in: stationIds }, status: "ACTIVE" }, select: stationSelect, orderBy: { name: "asc" } });
  let activeSwap = null;
  if (role !== Roles.ADMIN) {
    activeSwap = await prisma.swapTransaction.findFirst({
      where: { staffId, workflowStatus: { notIn: [SwapStatus.COMPLETED, SwapStatus.FAILED, SwapStatus.ROLLED_BACK] } },
      include: {
        station: true,
        booking: { include: { user: { select: { fullName: true, email: true } }, vehicle: true } }
      }
    });
  }

  return { stations, activeSwap };
};

const history = async (staffId: string, role: string) => {
  const context = await getContext(staffId, role);
  const stationIds = role === Roles.ADMIN ? undefined : context.stations.map((station) => station.id);
  return prisma.swapTransaction.findMany({ where: stationIds ? { stationId: { in: stationIds } } : {}, include: { station: true, booking: { include: { user: { select: { fullName: true, email: true } }, vehicle: true } }, batteryIn: true, batteryOut: true, inspection: true }, orderBy: { createdAt: "desc" }, take: 100 });
};

const lookup = async (bookingId: string, stationId: string, staffId: string, role: string) => {
  await assertStaffScope(staffId, role, stationId);
  const booking = await prisma.booking.findFirst({ where: { id: bookingId, stationId }, include: { user: { select: { id: true, fullName: true, phone: true, email: true } }, vehicle: true, battery: true, station: true, serviceBay: true, transactions: { orderBy: { createdAt: "desc" }, take: 1 } } });
  if (!booking) throw new NotFoundError("Booking not found at this station");
  return booking;
};

const checkIn = async (bookingId: string, stationId: string, serviceBayId: string, staffId: string, role: string) => {
  const booking = await prisma.booking.findFirst({ where: { id: bookingId, stationId }, include: { bayReservations: { where: { status: ReservationStatus.ACTIVE }, take: 1 } } });
  if (!booking) throw new NotFoundError("Booking not found at this station");
  await assertStaffScope(staffId, role, stationId);
  
  const existingActive = await prisma.swapTransaction.findFirst({
    where: { staffId, workflowStatus: { notIn: [SwapStatus.COMPLETED, SwapStatus.FAILED, SwapStatus.ROLLED_BACK] } }
  });
  if (existingActive) throw new AppError("Bạn phải hoàn tất quá trình thay pin đang thực hiện trước khi nhận thêm xe mới", 409);

  assertBookingTransition(booking.status, BookingStatus.CHECKED_IN);
  if (!booking.vehicleId) throw new AppError("Booking is missing vehicle", 409);
  if (booking.serviceBayId !== serviceBayId) throw new AppError("Booking is not assigned to the selected service bay", 409);
  const serviceBay = await prisma.serviceBay.findFirst({ where: { id: serviceBayId, stationId, status: "AVAILABLE" } });
  if (!serviceBay) throw new AppError("Selected service bay is not available at this station", 409);
  if (!booking.scheduledStart || !booking.scheduledEnd) throw new AppError("Booking is missing its scheduled time", 409);
  const activeBayReservation = booking.bayReservations.find((reservation) => reservation.serviceBayId === serviceBayId);
  if (!activeBayReservation) throw new AppError("Selected service bay no longer has an active reservation for this booking", 409);
  const now = new Date();
  if (process.env.NODE_ENV === "production" && process.env.E2E_TEST !== "true" && booking.scheduledStart && now < new Date(booking.scheduledStart.getTime() - 30 * 60_000)) throw new AppError("Check-in is only allowed 30 minutes before the appointment", 409);
  const existing = await prisma.swapTransaction.findFirst({ where: { bookingId } });
  if (existing) throw new AppError("A swap workflow already exists for this booking", 409);
  return prisma.$transaction(async (tx) => {
    await tx.booking.update({ where: { id: bookingId }, data: { status: BookingStatus.CHECKED_IN, serviceBayId } });
    await tx.slotReservation.updateMany({ where: { bookingId, status: ReservationStatus.ACTIVE }, data: { status: ReservationStatus.CONSUMED } });
    const swap = await tx.swapTransaction.create({ data: { bookingId, userId: booking.userId, vehicleId: booking.vehicleId!, stationId, staffId, workflowStatus: SwapStatus.NOT_STARTED, status: "SUCCESS" } });
    await tx.swapStepHistory.create({ data: { swapTransactionId: swap.id, actorId: staffId, toStatus: SwapStatus.NOT_STARTED, data: { action: "CHECK_IN", bookingId, serviceBayId, bayCode: serviceBay.bayCode } } });
    return swap;
  });
};

const getScopedSwap = async (id: string, staffId: string, role: string) => {
  const swap = await prisma.swapTransaction.findUnique({ where: { id }, include: { booking: { include: { user: { select: { fullName: true, email: true, phone: true } }, vehicle: true, battery: true } }, vehicle: true, batteryIn: true, batteryOut: true, inspection: true, stepHistory: { orderBy: { createdAt: "asc" } } } });
  if (!swap) throw new NotFoundError("Swap transaction not found");
  await assertStaffScope(staffId, role, swap.stationId);
  return { ...swap, nextActions: nextActions[swap.workflowStatus] };
};

const move = async (tx: Prisma.TransactionClient, id: string, actorId: string, from: SwapStatus, to: SwapStatus, data?: Prisma.InputJsonValue) => {
  assertSwapTransition(from, to);
  const updated = await tx.swapTransaction.update({ where: { id }, data: { workflowStatus: to } });
  await tx.swapStepHistory.create({ data: { swapTransactionId: id, actorId, fromStatus: from, toStatus: to, data } });
  return updated;
};

const verify = async (id: string, staffId: string, role: string) => {
  const swap = await getScopedSwap(id, staffId, role);
  if (!swap.booking || !swap.vehicleId || swap.booking.userId !== swap.userId || swap.booking.vehicleId !== swap.vehicleId) throw new AppError("Booking identity or vehicle does not match", 409);
  const assignment = await prisma.vehicleBatteryAssignment.findFirst({ where: { vehicleId: swap.vehicleId, active: true }, include: { battery: true } });
  if (!assignment) throw new AppError("Vehicle has no active battery assignment", 409);
  return prisma.$transaction((tx) => move(tx, id, staffId, swap.workflowStatus, SwapStatus.VERIFIED, { vehicleBatterySerial: assignment.battery.serialNumber }));
};

const removeOldBattery = async (id: string, staffId: string, role: string, input: { serialNumber: string; soc?: number }) => {
  const swap = await getScopedSwap(id, staffId, role);
  const assignment = swap.vehicleId ? await prisma.vehicleBatteryAssignment.findFirst({ where: { vehicleId: swap.vehicleId, active: true }, include: { battery: true } }) : null;
  if (!assignment || assignment.battery.serialNumber !== input.serialNumber) throw new AppError("Scanned battery is not installed in this vehicle", 409);
  assertSwapTransition(swap.workflowStatus, SwapStatus.OLD_BATTERY_REMOVED);
  return prisma.$transaction(async (tx) => {
    await tx.vehicleBatteryAssignment.update({ where: { id: assignment.id }, data: { active: false, removedAt: new Date() } });
    await tx.battery.update({ where: { id: assignment.batteryId }, data: { operationalStatus: BatteryOperationalStatus.REMOVED, soc: input.soc ?? assignment.battery.soc } });
    await tx.swapTransaction.update({ where: { id }, data: { batteryInId: assignment.batteryId, batteryInSoc: input.soc ?? assignment.battery.soc, workflowStatus: SwapStatus.OLD_BATTERY_REMOVED } });
    await tx.swapStepHistory.create({ data: { swapTransactionId: id, actorId: staffId, fromStatus: swap.workflowStatus, toStatus: SwapStatus.OLD_BATTERY_REMOVED, data: { serialNumber: input.serialNumber } } });
    return tx.swapTransaction.findUnique({ where: { id } });
  });
};

const inspect = async (id: string, staffId: string, role: string, input: { serialNumber: string; soc: number; soh: number; temperature?: number; voltage?: number; physicalCondition: string; outcome: "AVAILABLE" | "MAINTENANCE" | "QUARANTINED" | "RETIRED"; notes?: string }) => {
  const swap = await getScopedSwap(id, staffId, role);
  if (!swap.batteryIn || swap.batteryIn.serialNumber !== input.serialNumber) throw new AppError("Inspection battery does not match removed battery", 409);
  assertSwapTransition(swap.workflowStatus, SwapStatus.OLD_BATTERY_INSPECTED);
  const target = { AVAILABLE: BatteryOperationalStatus.AVAILABLE, MAINTENANCE: BatteryOperationalStatus.MAINTENANCE, QUARANTINED: BatteryOperationalStatus.QUARANTINED, RETIRED: BatteryOperationalStatus.RETIRED }[input.outcome];
  const accumulatedMileageKm = inferAccumulatedMileageKm(swap.batteryIn.accumulatedMileageKm, swap.batteryIn.soh);
  const soh = calculateBatterySoh(accumulatedMileageKm);
  return prisma.$transaction(async (tx) => {
    await tx.battery.update({ where: { id: swap.batteryInId! }, data: { soc: input.soc, soh, estimatedSoH: soh, accumulatedMileageKm, healthClassification: classifyBatterySoh(soh), healthSource: BatteryHealthSource.LIFECYCLE_SIMULATION, temperature: input.temperature, voltage: input.voltage, operationalStatus: target } });
    await tx.batteryInspection.create({ data: { swapTransactionId: id, batteryId: swap.batteryInId!, inspectorId: staffId, ...input, soh } });
    return move(tx, id, staffId, swap.workflowStatus, SwapStatus.OLD_BATTERY_INSPECTED, { outcome: input.outcome });
  });
};

const assignReplacement = async (id: string, staffId: string, role: string, serialNumber: string) => {
  const swap = await getScopedSwap(id, staffId, role);
  const reserved = swap.booking?.battery;
  if (!reserved || reserved.serialNumber !== serialNumber || reserved.operationalStatus !== BatteryOperationalStatus.RESERVED || reserved.safetyState !== "SAFE") throw new AppError("Scanned battery is not the safe battery reserved for this booking", 409);
  return prisma.$transaction(async (tx) => {
    await tx.swapTransaction.update({ where: { id }, data: { batteryOutId: reserved.id, batteryOutSoc: reserved.soc } });
    return move(tx, id, staffId, swap.workflowStatus, SwapStatus.REPLACEMENT_ASSIGNED, { serialNumber });
  });
};

const install = async (id: string, staffId: string, role: string, serialNumber: string) => {
  const swap = await getScopedSwap(id, staffId, role);
  if (!swap.batteryOut || swap.batteryOut.serialNumber !== serialNumber) throw new AppError("Installed battery does not match assigned replacement", 409);
  return prisma.$transaction((tx) => move(tx, id, staffId, swap.workflowStatus, SwapStatus.INSTALLED, { serialNumber }));
};

const collectPayment = async (id: string, staffId: string, role: string) => {
  const swap = await getScopedSwap(id, staffId, role);
  if (!swap.booking || !swap.vehicleId || !swap.batteryOutId || !swap.batteryOut) throw new AppError("Swap is missing booking, vehicle or replacement battery", 409);
  assertSwapTransition(swap.workflowStatus, SwapStatus.PAYMENT_PENDING);
  const booking = swap.booking;
  const amount = booking.costEstimate ?? 0;
  if (amount <= 0) throw new AppError("Booking has no valid cost estimate", 409);

  return prisma.$transaction(async (tx) => {
    await tx.swapTransaction.update({ where: { id }, data: { workflowStatus: SwapStatus.PAYMENT_PENDING, cost: amount } });
    await tx.swapStepHistory.create({ data: { swapTransactionId: id, actorId: staffId, fromStatus: swap.workflowStatus, toStatus: SwapStatus.PAYMENT_PENDING, data: { paymentMethod: "VNPAY", amount } } });
    await tx.invoice.upsert({
      where: { transactionId: id },
      update: { amount, paymentMethod: PaymentMethod.VNPAY, status: InvoiceStatus.UNPAID },
      create: { transactionId: id, amount, paymentMethod: PaymentMethod.VNPAY, status: InvoiceStatus.UNPAID },
    });
    await tx.notification.create({ data: { userId: swap.userId, type: NotificationType.PAYMENT_UPDATE, title: "Yêu cầu thanh toán", message: `Vui lòng thanh toán trực tiếp ${amount.toLocaleString("vi-VN")} VND qua VNPay để hoàn tất thay pin.`, entityType: "Booking", entityId: swap.bookingId! } });
    return tx.swapTransaction.findUniqueOrThrow({ where: { id }, include: { invoice: true, payments: true } });
  });
};

const rollback = async (id: string, staffId: string, role: string, reason: string) => {
  const swap = await getScopedSwap(id, staffId, role);
  if (swap.workflowStatus === SwapStatus.COMPLETED || swap.workflowStatus === SwapStatus.ROLLED_BACK) throw new AppError("Completed or rolled-back swap cannot be rolled back", 409);
  return prisma.$transaction(async (tx) => {
    assertSwapTransition(swap.workflowStatus, SwapStatus.FAILED);
    await tx.swapStepHistory.create({ data: { swapTransactionId: id, actorId: staffId, fromStatus: swap.workflowStatus, toStatus: SwapStatus.FAILED, data: { reason } } });
    if (swap.vehicleId && swap.batteryInId) {
      await tx.vehicleBatteryAssignment.updateMany({ where: { vehicleId: swap.vehicleId, batteryId: swap.batteryInId }, data: { active: true, removedAt: null } });
      await tx.battery.update({ where: { id: swap.batteryInId }, data: { operationalStatus: BatteryOperationalStatus.INSTALLED } });
    }
    const replacementBatteryId = swap.batteryOutId ?? swap.booking?.batteryId;
    if (replacementBatteryId) await tx.battery.update({ where: { id: replacementBatteryId }, data: { operationalStatus: BatteryOperationalStatus.AVAILABLE } });
    if (swap.bookingId) {
      await tx.bayReservation.updateMany({ where: { bookingId: swap.bookingId, status: ReservationStatus.ACTIVE }, data: { status: ReservationStatus.RELEASED } });
      await tx.batteryReservation.updateMany({ where: { bookingId: swap.bookingId, status: ReservationStatus.ACTIVE }, data: { status: ReservationStatus.RELEASED } });
      await tx.booking.update({ where: { id: swap.bookingId }, data: { status: BookingStatus.CANCELLED } });
    }
    await tx.swapStepHistory.create({ data: { swapTransactionId: id, actorId: staffId, fromStatus: SwapStatus.FAILED, toStatus: SwapStatus.ROLLED_BACK, data: { reason } } });
    return tx.swapTransaction.update({ where: { id }, data: { workflowStatus: SwapStatus.ROLLED_BACK, status: "FAILED", failureReason: reason } });
  });
};

export const staffSwapService = { getContext, history, lookup, checkIn, getScopedSwap, verify, removeOldBattery, inspect, assignReplacement, install, collectPayment, rollback };
