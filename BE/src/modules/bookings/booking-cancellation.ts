import { prisma } from "../../config/database";

const readCancellationReason = (after: unknown) => {
  if (!after || typeof after !== "object" || Array.isArray(after)) return null;
  const reason = (after as Record<string, unknown>).cancellationReason;
  return typeof reason === "string" && reason.trim() ? reason.trim() : null;
};

export const findAdminBookingCancellation = async (bookingId: string) => {
  const auditLog = await prisma.auditLog.findFirst({
    where: {
      entityType: "Booking",
      entityId: bookingId,
      action: "CANCEL_STATION_BOOKING",
    },
    include: {
      admin: { select: { id: true, fullName: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  if (!auditLog) return null;

  return {
    reason: readCancellationReason(auditLog.after),
    cancelledAt: auditLog.createdAt,
    cancelledBy: auditLog.admin
      ? {
          id: auditLog.admin.id,
          fullName: auditLog.admin.fullName,
        }
      : null,
    actorRole: auditLog.actorRole ?? "ADMIN",
  };
};
