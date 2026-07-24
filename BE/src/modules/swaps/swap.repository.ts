import { prisma } from "../../config/database";

export const swapRepository = {
  findHistoryByUserId: (userId: string) => prisma.swapTransaction.findMany({
    where: { userId },
    include: {
      station: { select: { id: true, name: true, address: true } },
      vehicle: { select: { id: true, name: true, plateNumber: true } },
      staff: { select: { fullName: true } },
      batteryIn: { select: { id: true, batteryCode: true, serialNumber: true, type: true, soc: true, soh: true, temperature: true, voltage: true } },
      batteryOut: { select: { id: true, batteryCode: true, serialNumber: true, type: true, soc: true, soh: true } },
      inspection: { select: { serialNumber: true, soc: true, soh: true, physicalCondition: true, outcome: true, notes: true, createdAt: true } },
      invoice: { select: { id: true, amount: true, paymentMethod: true, status: true, createdAt: true } },
      payments: { select: { id: true, amount: true, paymentMethod: true, status: true, vnpTxnRef: true, createdAt: true }, orderBy: { createdAt: "desc" } },
      stepHistory: { select: { id: true, fromStatus: true, toStatus: true, createdAt: true }, orderBy: { createdAt: "asc" } },
      booking: { select: { id: true } },
    },
    orderBy: { createdAt: "desc" },
  }),
};
