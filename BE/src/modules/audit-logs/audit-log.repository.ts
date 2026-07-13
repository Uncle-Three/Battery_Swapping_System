import { prisma } from "../../config/database";

export const auditLogRepository = {
  findMany: ({ limit = 50, offset = 0, action }: { limit?: number; offset?: number; action?: string } = {}) =>
    prisma.auditLog.findMany({
      where: action ? { action: { contains: action, mode: "insensitive" } } : undefined,
      include: {
        admin: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),

  count: ({ action }: { action?: string } = {}) =>
    prisma.auditLog.count({
      where: action ? { action: { contains: action, mode: "insensitive" } } : undefined,
    }),

  create: (input: { adminId?: string; action: string; details?: string }) =>
    prisma.auditLog.create({
      data: input,
    }),
};
