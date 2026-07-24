import { BookingApprovalAction, BookingStatus, NotificationType, ReservationStatus, type Prisma } from "@prisma/client";
import { prisma } from "../../config/database";
import { assertBookingTransition } from "../../common/state-machines/transitions";
import { NotFoundError } from "../../common/errors/not-found-error";
import { ForbiddenError } from "../../common/errors/forbidden-error";
import { AppError } from "../../common/errors/app-error";
import type { ProposeRescheduleInput } from "./manager-booking.validation";
import { Roles } from "../../constants/roles";
import { emailService } from "../email/email.service";
import { findAdminBookingCancellation } from "../bookings/booking-cancellation";

const assertStationScope = async (managerId: string, role: string, stationId: string) => {
  if (role === Roles.ADMIN) return;
  const assignments = await prisma.stationAssignment.findMany({
    where: { userId: managerId, stationId, assignmentRole: "MANAGER", active: true },
    select: { id: true, effectiveTo: true },
  });
  if (!assignments.some((assignment) => assignment.effectiveTo === null || assignment.effectiveTo === undefined || assignment.effectiveTo > new Date())) {
    throw new ForbiddenError("Manager is not assigned to this station");
  }
};

const releaseReservations = async (tx: Prisma.TransactionClient, bookingId: string, batteryId?: string | null) => {
  await tx.slotReservation.updateMany({ where: { bookingId, status: ReservationStatus.ACTIVE }, data: { status: ReservationStatus.RELEASED } });
  await tx.bayReservation.updateMany({ where: { bookingId, status: ReservationStatus.ACTIVE }, data: { status: ReservationStatus.RELEASED } });
  await tx.batteryReservation.updateMany({ where: { bookingId, status: ReservationStatus.ACTIVE }, data: { status: ReservationStatus.RELEASED } });
  if (batteryId) await tx.battery.updateMany({ where: { id: batteryId, operationalStatus: "RESERVED" }, data: { operationalStatus: "AVAILABLE" } });
};

const getPending = async (managerId: string, role: string) => {
  const stationFilter = role === Roles.ADMIN ? {} : { station: { assignments: { some: { userId: managerId, assignmentRole: "MANAGER" as const, active: true } } } };
  return prisma.booking.findMany({
    where: { status: BookingStatus.PENDING_APPROVAL, ...stationFilter },
    include: { user: { select: { id: true, fullName: true, email: true, phone: true } }, vehicle: true, station: true, slot: true, serviceBay: true, battery: true },
    orderBy: [{ priority: "desc" }, { scheduledStart: "asc" }],
  });
};

const getHistory = async (managerId: string, role: string) => {
  const stationFilter = role === Roles.ADMIN ? {} : { station: { assignments: { some: { userId: managerId, assignmentRole: "MANAGER" as const, active: true } } } };
  return prisma.booking.findMany({
    where: { status: { not: BookingStatus.PENDING_APPROVAL }, ...stationFilter },
    include: { user: { select: { id: true, fullName: true, email: true, phone: true } }, vehicle: true, station: true, slot: true, serviceBay: true, battery: true },
    orderBy: [{ updatedAt: "desc" }],
    take: 50,
  });
};

const getById = async (id: string, managerId: string, role: string) => {
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, fullName: true, email: true, phone: true } },
      vehicle: { include: { vehicleModel: true, batteryAssignments: { where: { active: true }, include: { battery: { include: { healthLogs: { orderBy: { recordedAt: "desc" }, take: 1 } } } } } } },
      station: true,
      slot: true,
      serviceBay: true,
      battery: { include: { batteryType: true } },
      replacementRequest: true,
      approvalHistory: { include: { manager: { select: { fullName: true } } }, orderBy: { createdAt: "asc" } },
      slotReservations: { include: { slot: true }, orderBy: { createdAt: "asc" } },
      batteryReservations: { include: { battery: true }, orderBy: { createdAt: "asc" } },
      transactions: { include: { staff: { select: { fullName: true } }, stepHistory: { orderBy: { createdAt: "asc" } } }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!booking) throw new NotFoundError("Booking not found");
  await assertStationScope(managerId, role, booking.stationId);
  const cancellation = booking.status === BookingStatus.CANCELLED
    ? await findAdminBookingCancellation(id)
    : null;
  return { ...booking, cancellation };
};

const bookingEmailBase = (booking: {
  user: { fullName: string; email: string };
  station: { name: string };
  vehicle?: { name: string; plateNumber: string } | null;
  scheduledStart?: Date | null;
}) => ({
  customerName: booking.user.fullName,
  customerEmail: booking.user.email,
  stationName: booking.station.name,
  vehicleName: booking.vehicle?.name,
  plateNumber: booking.vehicle?.plateNumber,
  scheduledStart: booking.scheduledStart,
});

const approve = async (id: string, managerId: string, role: string) => {
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      user: { select: { fullName: true, email: true } },
      vehicle: { select: { name: true, plateNumber: true } },
      station: { select: { name: true } },
      slotReservations: true,
      batteryReservations: true,
      bayReservations: true,
    },
  });
  if (!booking) throw new NotFoundError("Booking not found");
  await assertStationScope(managerId, role, booking.stationId);
  assertBookingTransition(booking.status, BookingStatus.APPROVED);
  if (booking.expiryTime <= new Date() || !booking.bayReservations.some((item) => item.status === ReservationStatus.ACTIVE)) {
    throw new AppError("Booking reservation is no longer active", 409);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const approved = await tx.booking.update({
      where: { id },
      data: { status: BookingStatus.APPROVED, approvedById: managerId, approvedAt: new Date(), rejectionReason: null },
    });
    await tx.bookingApprovalHistory.create({ data: { bookingId: id, managerId, action: BookingApprovalAction.APPROVED, beforeStatus: booking.status, afterStatus: BookingStatus.APPROVED } });
    await tx.notification.create({
      data: {
        userId: booking.userId,
        type: NotificationType.BOOKING_UPDATE,
        title: "Lich doi pin da duoc duyet",
        message: "Ban co the den tram theo thoi gian da dat.",
        entityType: "Booking",
        entityId: id,
      },
    });
    return approved;
  });

  await emailService.sendBookingApproved(bookingEmailBase(booking));
  return updated;
};

const reject = async (id: string, managerId: string, role: string, reason: string) => {
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      user: { select: { fullName: true, email: true } },
      vehicle: { select: { name: true, plateNumber: true } },
      station: { select: { name: true } },
    },
  });
  if (!booking) throw new NotFoundError("Booking not found");
  await assertStationScope(managerId, role, booking.stationId);
  assertBookingTransition(booking.status, BookingStatus.REJECTED);

  const updated = await prisma.$transaction(async (tx) => {
    await releaseReservations(tx, id, booking.batteryId);
    const rejected = await tx.booking.update({ where: { id }, data: { status: BookingStatus.REJECTED, rejectionReason: reason } });
    await tx.bookingApprovalHistory.create({ data: { bookingId: id, managerId, action: BookingApprovalAction.REJECTED, reason, beforeStatus: booking.status, afterStatus: BookingStatus.REJECTED } });
    await tx.notification.create({ data: { userId: booking.userId, type: NotificationType.BOOKING_UPDATE, title: "Lich doi pin bi tu choi", message: reason, entityType: "Booking", entityId: id } });
    return rejected;
  });

  await emailService.sendBookingRejected({ ...bookingEmailBase(booking), reason });
  return updated;
};

const proposeReschedule = async (id: string, managerId: string, role: string, input: ProposeRescheduleInput) => {
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      user: { select: { fullName: true, email: true } },
      vehicle: { select: { name: true, plateNumber: true } },
      station: { select: { name: true } },
    },
  });
  if (!booking) throw new NotFoundError("Booking not found");
  await assertStationScope(managerId, role, booking.stationId);
  assertBookingTransition(booking.status, BookingStatus.RESCHEDULE_PROPOSED);
  const slot = await prisma.batterySlot.findFirst({ where: { id: input.slotId, stationId: booking.stationId } });
  if (!slot) throw new AppError("Slot does not belong to booking station", 400);

  const updated = await prisma.$transaction(async (tx) => {
    await releaseReservations(tx, id, booking.batteryId);
    const proposal = { slotId: input.slotId, scheduledStart: input.scheduledStart.toISOString(), scheduledEnd: input.scheduledEnd.toISOString(), reason: input.reason };
    const rescheduled = await tx.booking.update({ where: { id }, data: { status: BookingStatus.RESCHEDULE_PROPOSED, rescheduleProposal: proposal } });
    await tx.bookingApprovalHistory.create({
      data: {
        bookingId: id,
        managerId,
        action: BookingApprovalAction.RESCHEDULE_PROPOSED,
        reason: input.reason,
        proposedStart: input.scheduledStart,
        proposedEnd: input.scheduledEnd,
        beforeStatus: booking.status,
        afterStatus: BookingStatus.RESCHEDULE_PROPOSED,
      },
    });
    await tx.notification.create({
      data: {
        userId: booking.userId,
        type: NotificationType.BOOKING_UPDATE,
        title: "Tram de xuat doi lich",
        message: input.reason,
        entityType: "Booking",
        entityId: id,
        metadata: proposal,
      },
    });
    return rescheduled;
  });

  await emailService.sendBookingRescheduled({ ...bookingEmailBase(booking), scheduledStart: input.scheduledStart, reason: input.reason });
  return updated;
};

export const managerBookingService = {
  getPending,
  getHistory,
  getById,
  approve,
  reject,
  proposeReschedule,
};
