import { prisma } from "../src/config/database";

const run = async () => {
  const vehicles = await prisma.vehicle.findMany({
    select: { id: true, isDeleted: true },
  });
  const visibleVehicleIds = vehicles
    .filter((vehicle) => vehicle.isDeleted !== true)
    .map((vehicle) => vehicle.id);

  const result = visibleVehicleIds.length
    ? await prisma.vehicle.updateMany({
        where: { id: { in: visibleVehicleIds } },
        data: { isDeleted: false },
      })
    : { count: 0 };

  const visible = await prisma.vehicle.count({ where: { isDeleted: false } });
  console.log(JSON.stringify({ normalized: result.count, visible }, null, 2));
};

run().finally(() => prisma.$disconnect());
