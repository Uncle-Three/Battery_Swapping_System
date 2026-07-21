import { NotificationStatus } from "@prisma/client";
import { prisma } from "../../config/database";
import { NotFoundError } from "../../common/errors/not-found-error";

export const notificationService = {
  listMine: (userId: string) => prisma.notification.findMany({
    where: { userId, status: { not: NotificationStatus.ARCHIVED } },
    orderBy: { createdAt: "desc" },
    take: 100,
  }),
  markRead: async (userId: string, id: string) => {
    const updated = await prisma.notification.updateMany({
      where: { id, userId },
      data: { status: NotificationStatus.READ, readAt: new Date() },
    });
    if (updated.count !== 1) throw new NotFoundError("Notification not found");
    return prisma.notification.findUnique({ where: { id } });
  },
};
