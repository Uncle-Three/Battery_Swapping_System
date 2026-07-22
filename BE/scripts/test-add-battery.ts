import "dotenv/config";
import { prisma } from "../src/config/database";
import { stationDetailService } from "../src/modules/station-detail/station-detail.service";

async function main() {
  const station = await prisma.station.findFirst();
  const admin = await prisma.user.findFirst({ where: { role: { name: "ADMIN" } } });
  if (!station || !admin) {
    console.log("No station or admin found");
    return;
  }

  console.log("Testing add battery to station:", station.name);
  const result = await stationDetailService.updateInventory(
    station.id,
    "BAT-DEMO-999",
    { action: "ADD", reason: "Thêm pin mới thử nghiệm" },
    admin.id
  );
  console.log("RESULT SUCCESS:", result.batteryCode, result.id);
}

main().finally(() => prisma.$disconnect());
