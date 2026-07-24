import { BayTimeSlotStatus, BookingStatus, ReservationStatus } from "@prisma/client";
import { prisma } from "../../config/database";

export const bookingRepository = {
  findAllByUserId: (userId: string) => prisma.booking.findMany({
    where: { userId },
    include: { station: true, slot: true, serviceBay: true, battery: { include: { batteryType: true } }, vehicle: true, replacementRequest: true },
    orderBy: { createdAt: "desc" },
  }),
  findActiveByUserId: (userId: string) => prisma.booking.findMany({
    where: { userId, status: { in: [BookingStatus.CREATED, BookingStatus.PENDING_APPROVAL, BookingStatus.APPROVED, BookingStatus.RESCHEDULE_PROPOSED, BookingStatus.RESCHEDULED, BookingStatus.CHECKED_IN] } },
    include: { station: true, slot: true, serviceBay: true, battery: { include: { batteryType: true } }, vehicle: true },
    orderBy: { createdAt: "desc" },
  }),
  findByIdForUser: (id: string, userId: string) => prisma.booking.findFirst({
    where: { id, userId }, include: {
      station: true, slot: true, serviceBay: true, battery: { include: { batteryType: true } }, vehicle: true, replacementRequest: true,
      approvalHistory: { include: { manager: { select: { id: true, fullName: true } } }, orderBy: { createdAt: "asc" } },
      slotReservations: { include: { slot: true }, orderBy: { createdAt: "asc" } },
      bayReservations: { include: { serviceBay: true }, orderBy: { createdAt: "asc" } },
      batteryReservations: { include: { battery: { include: { batteryType: true } } }, orderBy: { createdAt: "asc" } },
      transactions: { include: { staff: { select: { id: true, fullName: true, phone: true, email: true } }, invoice: true, inspection: true, stepHistory: { orderBy: { createdAt: "asc" } }, payments: { orderBy: { createdAt: "asc" } } } },
    },
  }),
  release: (id: string, userId: string) => prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findFirst({ where: { id, userId } });
    if (!booking) return null;
    await tx.slotReservation.updateMany({ where: { bookingId: id, status: ReservationStatus.ACTIVE }, data: { status: ReservationStatus.RELEASED } });
    await tx.bayReservation.updateMany({ where: { bookingId: id, status: ReservationStatus.ACTIVE }, data: { status: ReservationStatus.RELEASED } });
    await tx.batteryReservation.updateMany({ where: { bookingId: id, status: ReservationStatus.ACTIVE }, data: { status: ReservationStatus.RELEASED } });
    const bayTimeSlot = await tx.bayTimeSlot.findUnique({ where: { bookingId: id } });
    if (bayTimeSlot) {
      await tx.bayTimeSlot.update({
        where: { id: bayTimeSlot.id },
        data: {
          status: bayTimeSlot.startAt > new Date() ? BayTimeSlotStatus.AVAILABLE : BayTimeSlotStatus.EXPIRED,
          bookingId: null,
        },
      });
    }
    if (booking.batteryId) await tx.battery.updateMany({ where: { id: booking.batteryId, operationalStatus: "RESERVED" }, data: { operationalStatus: "AVAILABLE" } });
    return tx.booking.update({ where: { id }, data: { status: BookingStatus.CANCELLED } });
  }),
};
