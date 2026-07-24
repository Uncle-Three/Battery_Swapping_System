import { prisma } from "../../config/database";

export const replacementRequestService = {
  listMine: (userId: string) => prisma.replacementRequest.findMany({
    where: { vehicle: { userId } },
    include: {
      vehicle: { select: { id: true, name: true, plateNumber: true } },
      battery: { select: { id: true, serialNumber: true, safetyState: true, operationalStatus: true } },
    },
    orderBy: [{ mandatory: "desc" }, { priority: "desc" }, { createdAt: "desc" }],
  }),
};
