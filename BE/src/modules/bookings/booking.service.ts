import { BatteryOperationalStatus, BatterySafetyState, BookingStatus, Prisma, ReplacementRequestStatus, ReservationStatus } from "@prisma/client";
import { prisma } from "../../config/database";
import { BadRequestError } from "../../common/errors/bad-request-error";
import { ConflictError } from "../../common/errors/conflict-error";
import { NotFoundError } from "../../common/errors/not-found-error";
import { assertBookingTransition } from "../../common/state-machines/transitions";
import { bookingRepository } from "./booking.repository";
import type { CreateBookingInput } from "./booking.validation";

const reservationKey = (resourceId: string, startsAt: Date, endsAt: Date) =>
  `${resourceId}:${startsAt.toISOString()}:${endsAt.toISOString()}`;

export const bookingService = {
  getAll: (userId: string) => bookingRepository.findAllByUserId(userId),
  getActive: (userId: string) => bookingRepository.findActiveByUserId(userId),

  quote: async (userId: string, input: CreateBookingInput) => {
    const [vehicle, slot, serviceBay, priceSetting] = await Promise.all([
      prisma.vehicle.findFirst({ where: { id: input.vehicleId, userId }, include: { batteryAssignments: { where: { active: true }, include: { battery: true } } } }),
      input.slotId ? prisma.batterySlot.findFirst({ where: { id: input.slotId, stationId: input.stationId } }) : Promise.resolve(null),
      prisma.serviceBay.findFirst({ where: { id: input.serviceBayId, stationId: input.stationId, status: "AVAILABLE" } }),
      prisma.systemSetting.findUnique({ where: { key: "STANDARD_SWAP_PRICE" } }),
    ]);
    if (!vehicle) throw new NotFoundError("Vehicle not found");
    if (input.slotId && !slot) throw new BadRequestError("Slot does not belong to the selected station");
    if (!serviceBay) throw new BadRequestError("Replacement bay is not available at the selected station");
    const replacementRequest = input.replacementRequestId
      ? await prisma.replacementRequest.findFirst({ where: { id: input.replacementRequestId, vehicleId: vehicle.id, status: { notIn: [ReplacementRequestStatus.CANCELLED, ReplacementRequestStatus.COMPLETED] } } })
      : null;
    if (input.replacementRequestId && !replacementRequest) throw new NotFoundError("Replacement request not found");
    if (vehicle.batteryAssignments[0]?.battery.safetyState === BatterySafetyState.UNSAFE && !replacementRequest?.mandatory) {
      throw new BadRequestError("An unsafe battery requires its mandatory replacement request");
    }
    return {
      amount: Math.max(0, Number(priceSetting?.value ?? 45000)), currency: "VND",
      mandatory: replacementRequest?.mandatory ?? false, priority: replacementRequest?.priority ?? 0,
      reason: input.reason ?? replacementRequest?.reason ?? null,
      scheduledStart: input.scheduledStart, scheduledEnd: input.scheduledEnd,
    };
  },

  create: async (userId: string, input: CreateBookingInput) => {
    const [vehicle, slot, serviceBay, settings] = await Promise.all([
      prisma.vehicle.findFirst({
        where: { id: input.vehicleId, userId },
        include: { batteryAssignments: { where: { active: true }, include: { battery: true } } },
      }),
      input.slotId ? prisma.batterySlot.findFirst({ where: { id: input.slotId, stationId: input.stationId } }) : Promise.resolve(null),
      prisma.serviceBay.findFirst({ where: { id: input.serviceBayId, stationId: input.stationId, status: "AVAILABLE" } }),
      prisma.systemSetting.findMany({ where: { key: { in: ["STANDARD_SWAP_PRICE", "BOOKING_EXPIRY_MINUTES"] } } }),
    ]);
    if (!vehicle) throw new NotFoundError("Vehicle not found");
    if (input.slotId && !slot) throw new BadRequestError("Slot does not belong to the selected station");
    if (!serviceBay) throw new BadRequestError("Replacement bay is not available at the selected station");

    const existingBooking = await prisma.booking.findFirst({ where: {
      userId, vehicleId: vehicle.id, stationId: input.stationId, serviceBayId: input.serviceBayId,
      scheduledStart: input.scheduledStart,
      status: { in: [BookingStatus.CREATED, BookingStatus.PENDING_APPROVAL, BookingStatus.APPROVED, BookingStatus.CHECKED_IN] },
    } });
    if (existingBooking) return existingBooking;

    const currentBattery = vehicle.batteryAssignments[0]?.battery;
    let replacementRequest = null;
    if (input.replacementRequestId) {
      replacementRequest = await prisma.replacementRequest.findFirst({
        where: { id: input.replacementRequestId, vehicleId: vehicle.id, status: { notIn: [ReplacementRequestStatus.CANCELLED, ReplacementRequestStatus.COMPLETED] } },
      });
      if (!replacementRequest) throw new NotFoundError("Replacement request not found");
    }
    if (currentBattery?.safetyState === BatterySafetyState.UNSAFE && !replacementRequest?.mandatory) {
      throw new BadRequestError("An unsafe battery requires its mandatory replacement request");
    }

    const compatibleTypes = vehicle.vehicleModelId
      ? await prisma.batteryCompatibility.findMany({
        where: { vehicleModelId: vehicle.vehicleModelId, active: true }, select: { batteryTypeId: true },
      })
      : [];
    const batteries = await prisma.battery.findMany({
      where: {
        stationId: input.stationId,
        batteryTypeId: { in: compatibleTypes.map((item) => item.batteryTypeId) },
        safetyState: BatterySafetyState.SAFE,
        operationalStatus: BatteryOperationalStatus.AVAILABLE,
        reservations: { none: { status: ReservationStatus.ACTIVE, startsAt: { lt: input.scheduledEnd }, endsAt: { gt: input.scheduledStart } } },
      },
      orderBy: [{ soh: "desc" }, { soc: "desc" }],
      take: 1,
    });
    const battery = batteries[0] ?? null;

    const overlappingSlot = input.slotId ? await prisma.slotReservation.findFirst({
      where: { slotId: input.slotId, status: ReservationStatus.ACTIVE, startsAt: { lt: input.scheduledEnd }, endsAt: { gt: input.scheduledStart } },
    }) : null;
    if (overlappingSlot) throw new ConflictError("The selected slot is already reserved");
    const overlappingBay = await prisma.bayReservation.findFirst({
      where: { serviceBayId: input.serviceBayId, status: ReservationStatus.ACTIVE, startsAt: { lt: input.scheduledEnd }, endsAt: { gt: input.scheduledStart } },
    });
    if (overlappingBay) throw new ConflictError("The selected replacement bay and time are already full");

    const settingMap = new Map(settings.map((setting) => [setting.key, Number(setting.value)]));
    const holdMinutes = Math.max(1, settingMap.get("BOOKING_EXPIRY_MINUTES") || 30);
    const swapPrice = Math.max(0, settingMap.get("STANDARD_SWAP_PRICE") || 45000);
    const expiresAt = new Date(Math.min(input.scheduledStart.getTime(), Date.now() + holdMinutes * 60_000));
    try {
      return await prisma.$transaction(async (tx) => {
        const booking = await tx.booking.create({ data: {
          userId, vehicleId: vehicle.id, stationId: input.stationId, slotId: input.slotId, serviceBayId: input.serviceBayId,
          batteryId: battery?.id, replacementRequestId: replacementRequest?.id,
          mandatory: replacementRequest?.mandatory ?? false,
          priority: replacementRequest?.priority ?? 0,
          reason: input.reason ?? replacementRequest?.reason,
          scheduledStart: input.scheduledStart, scheduledEnd: input.scheduledEnd,
          timeSlot: `${input.scheduledStart.toISOString()}/${input.scheduledEnd.toISOString()}`,
          vehicleName: vehicle.name, costEstimate: swapPrice,
          status: BookingStatus.PENDING_APPROVAL, expiryTime: expiresAt,
        } });
        if (input.slotId) await tx.slotReservation.create({ data: {
          bookingId: booking.id, slotId: input.slotId,
          reservationKey: reservationKey(input.slotId, input.scheduledStart, input.scheduledEnd),
          startsAt: input.scheduledStart, endsAt: input.scheduledEnd, expiresAt,
        } });
        const bayReservationKey = reservationKey(input.serviceBayId, input.scheduledStart, input.scheduledEnd);
        const historicalBayReservation = await tx.bayReservation.findFirst({
          where: { reservationKey: bayReservationKey, status: { not: ReservationStatus.ACTIVE } },
          select: { id: true },
        });
        if (historicalBayReservation) await tx.bayReservation.update({
          where: { id: historicalBayReservation.id },
          data: { reservationKey: `${bayReservationKey}:history:${historicalBayReservation.id}` },
        });
        await tx.bayReservation.create({ data: {
          bookingId: booking.id, serviceBayId: input.serviceBayId,
          reservationKey: bayReservationKey,
          startsAt: input.scheduledStart, endsAt: input.scheduledEnd, expiresAt,
        } });
        if (battery) await tx.batteryReservation.create({ data: {
          bookingId: booking.id, batteryId: battery.id,
          reservationKey: reservationKey(battery.id, input.scheduledStart, input.scheduledEnd),
          startsAt: input.scheduledStart, endsAt: input.scheduledEnd, expiresAt,
        } });
        if (battery) await tx.battery.update({ where: { id: battery.id }, data: { operationalStatus: BatteryOperationalStatus.RESERVED } });
        if (replacementRequest) await tx.replacementRequest.update({ where: { id: replacementRequest.id }, data: { status: ReplacementRequestStatus.BOOKED } });
        return booking;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictError("Slot or battery was reserved by another booking");
      }
      throw error;
    }
  },

  getById: async (id: string, userId: string) => {
    const booking = await bookingRepository.findByIdForUser(id, userId);
    if (!booking) throw new NotFoundError("Booking not found");
    return booking;
  },

  cancel: async (id: string, userId: string) => {
    const booking = await bookingRepository.findByIdForUser(id, userId);
    if (!booking) throw new NotFoundError("Booking not found");
    assertBookingTransition(booking.status, BookingStatus.CANCELLED);
    return bookingRepository.release(id, userId);
  },

  confirmReschedule: async (id: string, userId: string) => {
    const booking = await prisma.booking.findFirst({ where: { id, userId }, include: { vehicle: true } });
    if (!booking) throw new NotFoundError("Booking not found");
    assertBookingTransition(booking.status, BookingStatus.RESCHEDULED);
    assertBookingTransition(BookingStatus.RESCHEDULED, BookingStatus.PENDING_APPROVAL);
    const proposal = booking.rescheduleProposal as { slotId?: string; scheduledStart?: string; scheduledEnd?: string; reason?: string } | null;
    if (!proposal?.slotId || !proposal.scheduledStart || !proposal.scheduledEnd || !booking.vehicle?.vehicleModelId) throw new BadRequestError("Booking has no valid reschedule proposal");
    const startsAt = new Date(proposal.scheduledStart); const endsAt = new Date(proposal.scheduledEnd);
    const [slot, compatibleTypes] = await Promise.all([
      prisma.batterySlot.findFirst({ where: { id: proposal.slotId, stationId: booking.stationId } }),
      prisma.batteryCompatibility.findMany({ where: { vehicleModelId: booking.vehicle.vehicleModelId, active: true }, select: { batteryTypeId: true } }),
    ]);
    if (!slot) throw new BadRequestError("Proposed slot does not belong to booking station");
    const battery = await prisma.battery.findFirst({ where: { stationId: booking.stationId, batteryTypeId: { in: compatibleTypes.map((item) => item.batteryTypeId) }, safetyState: BatterySafetyState.SAFE, operationalStatus: BatteryOperationalStatus.AVAILABLE }, orderBy: [{ soh: "desc" }, { soc: "desc" }] });
    if (!battery) throw new ConflictError("No compatible SAFE battery is available for proposed schedule");
    const expiryTime = new Date(Math.min(startsAt.getTime(), Date.now() + 30 * 60_000));
    try {
      return await prisma.$transaction(async (tx) => {
        await tx.slotReservation.create({ data: { bookingId: id, slotId: slot.id, reservationKey: reservationKey(slot.id, startsAt, endsAt), startsAt, endsAt, expiresAt: expiryTime } });
        await tx.batteryReservation.create({ data: { bookingId: id, batteryId: battery.id, reservationKey: reservationKey(battery.id, startsAt, endsAt), startsAt, endsAt, expiresAt: expiryTime } });
        await tx.battery.update({ where: { id: battery.id }, data: { operationalStatus: BatteryOperationalStatus.RESERVED } });
        await tx.auditLog.create({ data: { adminId: userId, actorRole: "MEMBER", stationId: booking.stationId, entityType: "Booking", entityId: id, action: "RESCHEDULE_CONFIRMED", before: { status: booking.status, proposal }, after: { status: BookingStatus.PENDING_APPROVAL, slotId: slot.id, batteryId: battery.id } } });
        return tx.booking.update({ where: { id }, data: { slotId: slot.id, batteryId: battery.id, scheduledStart: startsAt, scheduledEnd: endsAt, timeSlot: `${startsAt.toISOString()}/${endsAt.toISOString()}`, expiryTime, status: BookingStatus.PENDING_APPROVAL, rescheduleProposal: null } });
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new ConflictError("Proposed slot or battery was reserved by another booking");
      throw error;
    }
  },
};
