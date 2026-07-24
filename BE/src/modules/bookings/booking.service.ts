import { BatteryOperationalStatus, BatterySafetyState, BayTimeSlotStatus, BookingStatus, NotificationType, Prisma, ReplacementRequestStatus, ReservationStatus, ServiceBayStatus, SwapStatus, VehicleStatus } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { prisma } from "../../config/database";
import { BadRequestError } from "../../common/errors/bad-request-error";
import { ConflictError } from "../../common/errors/conflict-error";
import { NotFoundError } from "../../common/errors/not-found-error";
import { assertBookingTransition } from "../../common/state-machines/transitions";
import { bookingRepository } from "./booking.repository";
import type { CreateBookingInput } from "./booking.validation";
import { calculateBookingExpiry, normalizeBookingHoldMinutes, remainingBookingHoldMinutes } from "./booking-expiry";
import { formatVietnamDate, formatVietnamTime } from "../../common/utils/vietnam-time";
import { findAdminBookingCancellation } from "./booking-cancellation";

const reservationKey = (resourceId: string, startsAt: Date, endsAt: Date) =>
  `${resourceId}:${startsAt.toISOString()}:${endsAt.toISOString()}`;

const activeBookingStatuses = [
  BookingStatus.CREATED,
  BookingStatus.PENDING_APPROVAL,
  BookingStatus.APPROVED,
  BookingStatus.RESCHEDULE_PROPOSED,
  BookingStatus.RESCHEDULED,
  BookingStatus.CHECKED_IN,
];

const findOperationalBayIds = async (stationId: string) => (
  await prisma.serviceBay.findMany({
    where: {
      stationId,
      status: { notIn: [ServiceBayStatus.MAINTENANCE, ServiceBayStatus.INACTIVE] },
    },
    select: { id: true },
  })
).map((bay) => bay.id);

// MongoDB distinguishes an absent optional field from an explicit null in
// filters. Legacy/unreserved slots can have either representation.
const unassignedSlotFilter = {
  OR: [
    { bookingId: null },
    { bookingId: { isSet: false } },
  ],
} satisfies Prisma.BayTimeSlotWhereInput;
const weekdayCodes = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;
const isWithinStationSchedule = (
  station: { openingTime: string | null; closingTime: string | null; workingDays: string[] },
  startAt: Date,
  endAt: Date,
) => {
  const date = formatVietnamDate(startAt);
  const weekday = weekdayCodes[new Date(`${date}T12:00:00Z`).getUTCDay()];
  return (!station.workingDays.length || station.workingDays.includes(weekday))
    && (!station.openingTime || formatVietnamTime(startAt) >= station.openingTime)
    && (!station.closingTime || formatVietnamTime(endAt) <= station.closingTime);
};

const restoreLegacySwapTimeline = async (
  booking: NonNullable<Awaited<ReturnType<typeof bookingRepository.findByIdForUser>>>,
) => {
  const missing = booking.transactions.filter((transaction) => {
    const statuses = new Set(transaction.stepHistory.map((step) => step.toStatus));
    return !statuses.has(SwapStatus.REPLACEMENT_ASSIGNED) || !statuses.has(SwapStatus.INSTALLED);
  });
  if (!missing.length) return booking;

  const auditLogs = await prisma.auditLog.findMany({
    where: {
      action: { in: ["REPLACEMENT_BATTERY_RESERVED", "REPLACEMENT_BATTERY_INSTALLED"] },
      OR: missing.map((transaction) => ({ details: { contains: transaction.id } })),
    },
    orderBy: { createdAt: "asc" },
  });

  for (const log of auditLogs) {
    if (!log.details) continue;
    let details: Record<string, unknown>;
    try {
      details = JSON.parse(log.details) as Record<string, unknown>;
    } catch {
      continue;
    }
    const swapId = typeof details.swapId === "string" ? details.swapId : "";
    const transaction = missing.find((item) => item.id === swapId);
    const actorId = log.actorId ?? transaction?.staffId;
    if (!transaction || !actorId) continue;

    const toStatus = log.action === "REPLACEMENT_BATTERY_RESERVED"
      ? SwapStatus.REPLACEMENT_ASSIGNED
      : SwapStatus.INSTALLED;
    if (transaction.stepHistory.some((step) => step.toStatus === toStatus)) continue;

    transaction.stepHistory.push({
      id: `audit-${log.id}`,
      swapTransactionId: transaction.id,
      actorId,
      fromStatus: toStatus === SwapStatus.REPLACEMENT_ASSIGNED
        ? SwapStatus.OLD_BATTERY_REMOVED
        : SwapStatus.REPLACEMENT_ASSIGNED,
      toStatus,
      data: {
        action: toStatus === SwapStatus.REPLACEMENT_ASSIGNED ? "ASSIGN_REPLACEMENT" : "INSTALL",
        batteryId: log.entityId,
        restoredFromAudit: true,
      },
      createdAt: log.createdAt,
    });
    transaction.stepHistory.sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());
  }

  return booking;
};

export const bookingService = {
  getAll: (userId: string) => bookingRepository.findAllByUserId(userId),
  getActive: (userId: string) => bookingRepository.findActiveByUserId(userId),

  quote: async (userId: string, input: CreateBookingInput) => {
    const scheduledStart = input.scheduledStart!;
    const scheduledEnd = input.scheduledEnd!;
    const [vehicle, slot, priceSetting] = await Promise.all([
      prisma.vehicle.findFirst({ where: { id: input.vehicleId, userId }, include: { batteryAssignments: { where: { active: true }, include: { battery: true } } } }),
      input.slotId ? prisma.batterySlot.findFirst({ where: { id: input.slotId, stationId: input.stationId } }) : Promise.resolve(null),
      prisma.systemSetting.findUnique({ where: { key: "STANDARD_SWAP_PRICE" } }),
    ]);
    if (!vehicle) throw new NotFoundError("Vehicle not found");
    if (vehicle.status !== VehicleStatus.ACTIVE) throw new BadRequestError("Xe đang tắt nên không thể đặt lịch thay pin");
    const activeBooking = await prisma.booking.findFirst({
      where: { userId, vehicleId: vehicle.id, status: { in: activeBookingStatuses } },
      select: { id: true },
    });
    if (activeBooking) throw new ConflictError("Vehicle already has an active booking");
    const [station, operationalBayIds] = await Promise.all([
      prisma.station.findFirst({
        where: { id: input.stationId, status: "ACTIVE" },
        select: { id: true, openingTime: true, closingTime: true, workingDays: true },
      }),
      findOperationalBayIds(input.stationId),
    ]);
    if (!station) throw new NotFoundError("Active station not found");
    if (!isWithinStationSchedule(station, scheduledStart, scheduledEnd)) {
      throw new BadRequestError("Khung giờ nằm ngoài ngày hoặc giờ hoạt động của trạm.");
    }
    if (input.slotId && !slot) throw new BadRequestError("Slot does not belong to the selected station");
    const assignableSlot = operationalBayIds.length
      ? await prisma.bayTimeSlot.findFirst({
        where: {
          stationId: input.stationId,
          bayId: { in: operationalBayIds },
          startAt: { gte: new Date(scheduledStart.getTime() - 1000), lte: new Date(scheduledStart.getTime() + 1000) },
          endAt: { gte: new Date(scheduledEnd.getTime() - 1000), lte: new Date(scheduledEnd.getTime() + 1000) },
          status: BayTimeSlotStatus.AVAILABLE,
          ...unassignedSlotFilter,
        },
        select: { id: true },
      })
      : null;
    if (!assignableSlot) throw new ConflictError("Khung giờ không còn khả dụng.");
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
      scheduledStart, scheduledEnd,
    };
  },

  create: async (userId: string, input: CreateBookingInput) => {
    const scheduledStart = input.scheduledStart!;
    const scheduledEnd = input.scheduledEnd!;
    const [vehicle, slot, settings] = await Promise.all([
      prisma.vehicle.findFirst({
        where: { id: input.vehicleId, userId },
        include: { batteryAssignments: { where: { active: true }, include: { battery: true } } },
      }),
      input.slotId ? prisma.batterySlot.findFirst({ where: { id: input.slotId, stationId: input.stationId } }) : Promise.resolve(null),
      prisma.systemSetting.findMany({ where: { key: { in: ["STANDARD_SWAP_PRICE", "BOOKING_EXPIRY_MINUTES"] } } }),
    ]);
    if (!vehicle) throw new NotFoundError("Vehicle not found");
    if (vehicle.status !== VehicleStatus.ACTIVE) throw new BadRequestError("Xe đang tắt nên không thể đặt lịch thay pin");
    if (input.slotId && !slot) throw new BadRequestError("Slot does not belong to the selected station");

    const activeBooking = await prisma.booking.findFirst({
      where: { userId, vehicleId: vehicle.id, status: { in: activeBookingStatuses } },
    });
    if (activeBooking) {
      const isSameRequest = activeBooking.stationId === input.stationId
        && activeBooking.scheduledStart?.getTime() === scheduledStart.getTime();
      if (isSameRequest) return activeBooking;
      throw new ConflictError("Vehicle already has an active booking");
    }
    const station = await prisma.station.findFirst({
      where: { id: input.stationId, status: "ACTIVE" },
      select: { id: true, openingTime: true, closingTime: true, workingDays: true },
    });
    if (!station) throw new NotFoundError("Active station not found");
    if (!isWithinStationSchedule(station, scheduledStart, scheduledEnd)) {
      throw new BadRequestError("Khung giờ nằm ngoài ngày hoặc giờ hoạt động của trạm.");
    }
    const operationalBayIds = await findOperationalBayIds(input.stationId);

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
        reservations: { none: { status: ReservationStatus.ACTIVE, startsAt: { lt: scheduledEnd }, endsAt: { gt: scheduledStart } } },
      },
      orderBy: [{ soh: "desc" }, { soc: "desc" }],
      take: 1,
    });
    const battery = batteries[0] ?? null;

    const overlappingSlot = input.slotId ? await prisma.slotReservation.findFirst({
      where: { slotId: input.slotId, status: ReservationStatus.ACTIVE, startsAt: { lt: scheduledEnd }, endsAt: { gt: scheduledStart } },
    }) : null;
    if (overlappingSlot) throw new ConflictError("The selected slot is already reserved");
    const overlappingBay = await prisma.bayReservation.findFirst({
      where: {
        serviceBayId: input.serviceBayId ?? "000000000000000000000000",
        status: ReservationStatus.ACTIVE,
        startsAt: { lt: scheduledEnd },
        endsAt: { gt: scheduledStart },
        booking: { status: { in: activeBookingStatuses } },
      },
    });
    if (overlappingBay) throw new ConflictError("The selected replacement bay and time are already full");
    const [managedBayTimeSlot] = await Promise.all([
      prisma.bayTimeSlot.findFirst({
        where: {
          stationId: input.stationId,
          bayId: { in: operationalBayIds },
          startAt: { gte: new Date(scheduledStart.getTime() - 1000), lte: new Date(scheduledStart.getTime() + 1000) },
          endAt: { gte: new Date(scheduledEnd.getTime() - 1000), lte: new Date(scheduledEnd.getTime() + 1000) },
          status: BayTimeSlotStatus.AVAILABLE,
          ...unassignedSlotFilter,
        },
        include: { bay: { select: { id: true, bayCode: true, bayName: true } } },
      }),
    ]);
    if (
      !managedBayTimeSlot
      || managedBayTimeSlot.status !== BayTimeSlotStatus.AVAILABLE
      || managedBayTimeSlot.bookingId
      || managedBayTimeSlot.endAt <= new Date()
    ) {
      throw new ConflictError("Khung giờ không còn khả dụng.");
    }

    const settingMap = new Map(settings.map((setting) => [setting.key, Number(setting.value)]));
    const holdMinutes = normalizeBookingHoldMinutes(settingMap.get("BOOKING_EXPIRY_MINUTES"));
    const swapPrice = Math.max(0, settingMap.get("STANDARD_SWAP_PRICE") || 45000);
    const expiresAt = calculateBookingExpiry(scheduledStart, holdMinutes);
    try {
      return await prisma.$transaction(async (tx) => {
        const candidates = await tx.bayTimeSlot.findMany({
          where: {
            stationId: input.stationId,
            bayId: { in: operationalBayIds },
            startAt: { gte: new Date(scheduledStart.getTime() - 1000), lte: new Date(scheduledStart.getTime() + 1000) },
            endAt: { gte: new Date(scheduledEnd.getTime() - 1000), lte: new Date(scheduledEnd.getTime() + 1000) },
            status: BayTimeSlotStatus.AVAILABLE,
            ...unassignedSlotFilter,
          },
          include: { bay: { select: { id: true, bayCode: true, bayName: true } } },
          orderBy: { bayId: "asc" },
        });
        let assigned: (typeof candidates)[number] | undefined = candidates[0];
        for (const candidate of candidates) {
          const claimed = await tx.bayTimeSlot.updateMany({
            where: { id: candidate.id, status: BayTimeSlotStatus.AVAILABLE, ...unassignedSlotFilter },
            data: { status: BayTimeSlotStatus.RESERVED },
          });
          if (claimed.count === 1) {
            assigned = candidate;
            break;
          }
          assigned = undefined;
        }
        if (!assigned) throw new ConflictError("Khung giờ không còn khả dụng.");

        const bookingDate = scheduledStart.toISOString().slice(0, 10).replaceAll("-", "");
        const booking = await tx.booking.create({ data: {
          bookingCode: `BKG-${bookingDate}-${randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()}`,
          userId, vehicleId: vehicle.id, stationId: input.stationId, slotId: input.slotId, serviceBayId: assigned.bayId,
          batteryId: battery?.id, replacementRequestId: replacementRequest?.id,
          mandatory: replacementRequest?.mandatory ?? false,
          priority: replacementRequest?.priority ?? 0,
          reason: input.reason ?? replacementRequest?.reason,
          scheduledStart, scheduledEnd,
          timeSlot: `${scheduledStart.toISOString()}/${scheduledEnd.toISOString()}`,
          vehicleName: vehicle.name, costEstimate: swapPrice,
          status: BookingStatus.PENDING_APPROVAL, expiryTime: expiresAt,
        } });
        const remainingMinutes = remainingBookingHoldMinutes(expiresAt);
        if (assigned) {
          const reserved = await tx.bayTimeSlot.updateMany({
            where: {
              id: assigned.id,
              status: BayTimeSlotStatus.RESERVED,
              ...unassignedSlotFilter,
              endAt: { gt: new Date() },
            },
            data: { status: BayTimeSlotStatus.RESERVED, bookingId: booking.id },
          });
          if (reserved.count !== 1) throw new ConflictError("Khung giờ không còn khả dụng.");
        }
        await tx.notification.create({ data: {
          userId,
          type: NotificationType.BOOKING_UPDATE,
          title: "Đã giữ chỗ cho lịch thay pin",
          message: `Chỗ được giữ đến ${expiresAt.toLocaleString("vi-VN")}, tức ${holdMinutes} phút sau giờ hẹn. Hãy check-in trước thời điểm này để lịch không hết hạn.`,
          entityType: "Booking",
          entityId: booking.id,
          metadata: { expiryTime: expiresAt.toISOString(), holdMinutes, remainingMinutes },
        } });
        if (input.slotId) await tx.slotReservation.create({ data: {
          bookingId: booking.id, slotId: input.slotId,
          reservationKey: reservationKey(input.slotId, scheduledStart, scheduledEnd),
          startsAt: scheduledStart, endsAt: scheduledEnd, expiresAt,
        } });
        const bayReservationKey = reservationKey(assigned.bayId, scheduledStart, scheduledEnd);
        // Giải phóng / rename TẤT CẢ bản ghi cũ có cùng key (kể cả ACTIVE của booking đã xong)
        const staleBayReservations = await tx.bayReservation.findMany({
          where: { reservationKey: bayReservationKey },
          select: { id: true, status: true, bookingId: true },
        });
        for (const stale of staleBayReservations) {
          // Nếu vẫn ACTIVE nhưng booking đã kết thúc → set RELEASED
          const nextStatus = stale.status === ReservationStatus.ACTIVE ? ReservationStatus.RELEASED : stale.status;
          await tx.bayReservation.update({
            where: { id: stale.id },
            data: {
              status: nextStatus,
              reservationKey: `${bayReservationKey}:history:${stale.id}`,
            },
          });
        }
        await tx.bayReservation.create({ data: {
          bookingId: booking.id, serviceBayId: assigned.bayId,
          reservationKey: bayReservationKey,
          startsAt: scheduledStart, endsAt: scheduledEnd, expiresAt,
        } });
        if (battery) await tx.batteryReservation.create({ data: {
          bookingId: booking.id, batteryId: battery.id,
          reservationKey: reservationKey(battery.id, scheduledStart, scheduledEnd),
          startsAt: scheduledStart, endsAt: scheduledEnd, expiresAt,
        } });
        if (battery) await tx.battery.update({ where: { id: battery.id }, data: { operationalStatus: BatteryOperationalStatus.RESERVED } });
        if (replacementRequest) await tx.replacementRequest.update({ where: { id: replacementRequest.id }, data: { status: ReplacementRequestStatus.BOOKED } });
        return {
          ...booking,
          assignedSlot: {
            id: assigned.id,
            startAt: assigned.startAt,
            endAt: assigned.endAt,
          },
          assignedBay: assigned.bay,
        };
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictError("Khung giờ không còn khả dụng.");
      }
      throw error;
    }
  },

  getById: async (id: string, userId: string) => {
    const booking = await bookingRepository.findByIdForUser(id, userId);
    if (!booking) throw new NotFoundError("Booking not found");
    const [restoredBooking, cancellation] = await Promise.all([
      restoreLegacySwapTimeline(booking),
      booking.status === BookingStatus.CANCELLED
        ? findAdminBookingCancellation(id)
        : Promise.resolve(null),
    ]);
    return { ...restoredBooking, cancellation };
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
    if (booking.vehicle?.status !== VehicleStatus.ACTIVE) throw new BadRequestError("Xe đang tắt nên không thể xác nhận lịch thay pin");
    assertBookingTransition(booking.status, BookingStatus.RESCHEDULED);
    assertBookingTransition(BookingStatus.RESCHEDULED, BookingStatus.PENDING_APPROVAL);
    const proposal = booking.rescheduleProposal as { slotId?: string; scheduledStart?: string; scheduledEnd?: string; reason?: string } | null;
    if (!proposal?.slotId || !proposal.scheduledStart || !proposal.scheduledEnd || !booking.vehicle?.vehicleModelId) throw new BadRequestError("Booking has no valid reschedule proposal");
    const startsAt = new Date(proposal.scheduledStart); const endsAt = new Date(proposal.scheduledEnd);
    const [slot, compatibleTypes, holdSetting] = await Promise.all([
      prisma.batterySlot.findFirst({ where: { id: proposal.slotId, stationId: booking.stationId } }),
      prisma.batteryCompatibility.findMany({ where: { vehicleModelId: booking.vehicle.vehicleModelId, active: true }, select: { batteryTypeId: true } }),
      prisma.systemSetting.findUnique({ where: { key: "BOOKING_EXPIRY_MINUTES" } }),
    ]);
    if (!slot) throw new BadRequestError("Proposed slot does not belong to booking station");
    const battery = await prisma.battery.findFirst({ where: { stationId: booking.stationId, batteryTypeId: { in: compatibleTypes.map((item) => item.batteryTypeId) }, safetyState: BatterySafetyState.SAFE, operationalStatus: BatteryOperationalStatus.AVAILABLE }, orderBy: [{ soh: "desc" }, { soc: "desc" }] });
    if (!battery) throw new ConflictError("No compatible SAFE battery is available for proposed schedule");
    const holdMinutes = normalizeBookingHoldMinutes(holdSetting?.value);
    const expiryTime = calculateBookingExpiry(startsAt, holdMinutes);
    try {
      return await prisma.$transaction(async (tx) => {
        await tx.slotReservation.create({ data: { bookingId: id, slotId: slot.id, reservationKey: reservationKey(slot.id, startsAt, endsAt), startsAt, endsAt, expiresAt: expiryTime } });
        await tx.batteryReservation.create({ data: { bookingId: id, batteryId: battery.id, reservationKey: reservationKey(battery.id, startsAt, endsAt), startsAt, endsAt, expiresAt: expiryTime } });
        await tx.battery.update({ where: { id: battery.id }, data: { operationalStatus: BatteryOperationalStatus.RESERVED } });
        await tx.auditLog.create({ data: { adminId: userId, actorRole: "MEMBER", stationId: booking.stationId, entityType: "Booking", entityId: id, action: "RESCHEDULE_CONFIRMED", before: { status: booking.status, proposal }, after: { status: BookingStatus.PENDING_APPROVAL, slotId: slot.id, batteryId: battery.id } } });
        const remainingMinutes = remainingBookingHoldMinutes(expiryTime);
        await tx.notification.create({ data: {
          userId,
          type: NotificationType.BOOKING_UPDATE,
          title: "Đã giữ chỗ cho lịch thay pin mới",
          message: `Chỗ được giữ đến ${expiryTime.toLocaleString("vi-VN")}, tức ${holdMinutes} phút sau giờ hẹn. Hãy check-in trước thời điểm này.`,
          entityType: "Booking",
          entityId: id,
          metadata: { expiryTime: expiryTime.toISOString(), holdMinutes, remainingMinutes },
        } });
        return tx.booking.update({ where: { id }, data: { slotId: slot.id, batteryId: battery.id, scheduledStart: startsAt, scheduledEnd: endsAt, timeSlot: `${startsAt.toISOString()}/${endsAt.toISOString()}`, expiryTime, status: BookingStatus.PENDING_APPROVAL, rescheduleProposal: null } });
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new ConflictError("Proposed slot or battery was reserved by another booking");
      throw error;
    }
  },
};
