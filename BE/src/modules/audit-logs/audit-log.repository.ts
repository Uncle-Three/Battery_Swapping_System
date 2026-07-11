import { prisma } from "../../config/database";

export const auditLogRepository = {
  findMany: () =>
    prisma.auditLog.findMany({
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
    }),

  create: (input: { adminId?: string; action: string; details?: string }) =>
    prisma.auditLog.create({
      data: input,
    }),
};
