import { BatteryOperationalStatus, BayTimeSlotStatus, BookingStatus, NotificationType, ReservationStatus } from "@prisma/client";
import { prisma } from "../../config/database";

const expirableStatuses = [
  BookingStatus.CREATED,
  BookingStatus.PENDING_APPROVAL,
  BookingStatus.APPROVED,
  BookingStatus.RESCHEDULE_PROPOSED,
  BookingStatus.RESCHEDULED,
];

export const expireBookings = async (now = new Date()): Promise<number> => {
  const bookings = await prisma.booking.findMany({
    where: { expiryTime: { lte: now }, status: { in: expirableStatuses } },
    select: { id: true, userId: true },
    take: 100,
  });
  for (const booking of bookings) {
    await prisma.$transaction(async (tx) => {
      const claimed = await tx.booking.updateMany({
        where: { id: booking.id, expiryTime: { lte: now }, status: { in: expirableStatuses } },
        data: { status: BookingStatus.EXPIRED },
      });
      if (claimed.count !== 1) return;
      const batteryReservations = await tx.batteryReservation.findMany({
        where: { bookingId: booking.id, status: ReservationStatus.ACTIVE }, select: { batteryId: true },
      });
      await tx.slotReservation.updateMany({ where: { bookingId: booking.id, status: ReservationStatus.ACTIVE }, data: { status: ReservationStatus.EXPIRED } });
      await tx.bayReservation.updateMany({ where: { bookingId: booking.id, status: ReservationStatus.ACTIVE }, data: { status: ReservationStatus.EXPIRED } });
      await tx.batteryReservation.updateMany({ where: { bookingId: booking.id, status: ReservationStatus.ACTIVE }, data: { status: ReservationStatus.EXPIRED } });
      await tx.bayTimeSlot.updateMany({
        where: { bookingId: booking.id, status: BayTimeSlotStatus.RESERVED },
        data: { status: BayTimeSlotStatus.EXPIRED },
      });
      await tx.battery.updateMany({
        where: { id: { in: batteryReservations.map((reservation) => reservation.batteryId) }, operationalStatus: BatteryOperationalStatus.RESERVED },
        data: { operationalStatus: BatteryOperationalStatus.AVAILABLE },
      });
      await tx.notification.create({
        data: {
          userId: booking.userId,
          type: NotificationType.BOOKING_UPDATE,
          title: "Đã hết thời gian giữ chỗ",
          message: "Bạn chưa check-in trước khi hết thời gian giữ chỗ sau giờ hẹn, nên lịch và tài nguyên đã được giải phóng.",
          entityType: "Booking",
          entityId: booking.id,
        },
      });
    });
  }
  return bookings.length;
};

export const startBookingScheduler = (): NodeJS.Timeout => {
  const timer = setInterval(() => {
    expireBookings().catch((error: unknown) => console.error("Booking expiration job failed", error));
  }, 60_000);
  timer.unref();
  return timer;
};
