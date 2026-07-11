import { Prisma } from "@prisma/client";
import { prisma } from "../../config/database";

export const userRepository = {
  findById: (id: string) =>
    prisma.user.findUnique({
      where: { id },
      include: { role: true, wallet: true },
    }),

  findByPhone: (phone: string) =>
    prisma.user.findUnique({
      where: { phone },
      include: { role: true, wallet: true },
    }),

  updateProfile: (id: string, data: { fullName?: string; phone?: string | null; avatarUrl?: string | null }) =>
    prisma.user.update({
      where: { id },
      data,
      include: { role: true, wallet: true },
    }),

  findMany: () =>
    prisma.user.findMany({
      include: { role: true, wallet: true },
      orderBy: { createdAt: "desc" },
    }),

  isUniqueConstraintError: (error: unknown): boolean => {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
  },
};
