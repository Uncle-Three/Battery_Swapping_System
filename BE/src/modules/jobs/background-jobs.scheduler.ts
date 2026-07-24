import { NotificationType, ReplacementRequestStatus, ReservationStatus } from "@prisma/client";
import { prisma } from "../../config/database";
import { expireBookings } from "../bookings/booking.scheduler";
import { bayTimeSlotService } from "../bay-time-slots/bay-time-slot.service";

export type JobRunSummary = { job: string; processed: number; startedAt: Date; finishedAt: Date };

export const notifyOverdueMandatoryReplacements = async (now = new Date()): Promise<number> => {
  const cutoff = new Date(now.getTime() - 24 * 60 * 60_000);
  const requests = await prisma.replacementRequest.findMany({
    where: { mandatory: true, createdAt: { lte: cutoff }, status: { in: [ReplacementRequestStatus.USER_NOTIFIED, ReplacementRequestStatus.BOOKING_REQUIRED] } },
    include: { vehicle: { select: { userId: true } } }, take: 100,
  });
  let created = 0;
  for (const request of requests) {
    const reminderKey = `${request.id}:${now.toISOString().slice(0, 10)}`;
    const exists = await prisma.notification.findFirst({ where: { userId: request.vehicle.userId, entityType: "ReplacementReminder", entityId: reminderKey }, select: { id: true } });
    if (exists) continue;
    await prisma.notification.create({ data: { userId: request.vehicle.userId, type: NotificationType.MANDATORY_REPLACEMENT, title: "Nhắc thay pin bắt buộc", message: "Yêu cầu thay pin bắt buộc của bạn vẫn chưa được đặt lịch.", entityType: "ReplacementReminder", entityId: reminderKey, metadata: { replacementRequestId: request.id } } });
    created += 1;
  }
  return created;
};

export const cleanupStaleReservations = async (now = new Date()): Promise<number> => {
  const [slots, batteries] = await Promise.all([
    prisma.slotReservation.updateMany({ where: { status: ReservationStatus.ACTIVE, expiresAt: { lte: now } }, data: { status: ReservationStatus.EXPIRED } }),
    prisma.batteryReservation.findMany({ where: { status: ReservationStatus.ACTIVE, expiresAt: { lte: now } }, select: { id: true, batteryId: true } }),
  ]);
  if (batteries.length) await prisma.$transaction(async (tx) => {
    await tx.batteryReservation.updateMany({ where: { id: { in: batteries.map((item) => item.id) }, status: ReservationStatus.ACTIVE }, data: { status: ReservationStatus.EXPIRED } });
    await tx.battery.updateMany({ where: { id: { in: batteries.map((item) => item.batteryId) }, operationalStatus: "RESERVED" }, data: { operationalStatus: "AVAILABLE" } });
  });
  return slots.count + batteries.length;
};

export const cleanupExpiredEmailVerificationTokens = async (now = new Date()): Promise<number> => {
  const deleted = await prisma.emailVerificationToken.deleteMany({ where: { expiresAt: { lte: now } } });
  return deleted.count;
};

export const runBackgroundJobs = async (now = new Date()): Promise<JobRunSummary[]> => {
  const startedAt = new Date();
  const [expiredBookings, reminders, staleReservations, expiredEmailTokens, expiredBayTimeSlots, releasedBayCooldowns] = await Promise.all([
    expireBookings(now),
    notifyOverdueMandatoryReplacements(now),
    cleanupStaleReservations(now),
    cleanupExpiredEmailVerificationTokens(now),
    bayTimeSlotService.expirePast(now),
    bayTimeSlotService.releaseCompletedCooldowns(now),
  ]);
  const finishedAt = new Date();
  const summaries = [
    { job: "booking-expiration", processed: expiredBookings, startedAt, finishedAt },
    { job: "mandatory-replacement-reminder", processed: reminders, startedAt, finishedAt },
    { job: "stale-reservation-cleanup", processed: staleReservations, startedAt, finishedAt },
    { job: "email-verification-token-cleanup", processed: expiredEmailTokens, startedAt, finishedAt },
    { job: "bay-time-slot-expiration", processed: expiredBayTimeSlots, startedAt, finishedAt },
    { job: "bay-time-slot-cooldown-release", processed: releasedBayCooldowns, startedAt, finishedAt },
  ];
  console.info("Background jobs completed", summaries.map(({ job, processed }) => ({ job, processed })));
  return summaries;
};

export const startBackgroundJobs = () => {
  void runBackgroundJobs().catch((error: unknown) => console.error("Initial background job run failed", error));
  const timer = setInterval(() => void runBackgroundJobs().catch((error: unknown) => console.error("Background job run failed", error)), 60_000);
  timer.unref();
  return () => clearInterval(timer);
};
