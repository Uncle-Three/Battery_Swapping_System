import {
  PrismaClient,
  RoleName,
  BatteryStatus,
  SlotStatus,
  StationStatus,
  MaintenanceSeverity,
  VehicleStatus,
} from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

const main = async () => {
  const passwordHash = await bcrypt.hash("123456", 12);

  await prisma.auditLog.deleteMany();
  await prisma.systemSetting.deleteMany();
  await prisma.batteryHealthLog.deleteMany();
  await prisma.maintenanceRecord.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.subscriptionPackage.deleteMany();
  await prisma.paymentTransaction.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.swapTransaction.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.battery.deleteMany();
  await prisma.batterySlot.deleteMany();
  await prisma.station.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();

  const roles = await Promise.all(
    Object.values(RoleName).map((name) =>
      prisma.role.create({
        data: { name },
      }),
    ),
  );

  const roleByName = new Map(roles.map((role) => [role.name, role]));

  const admin = await prisma.user.create({
    data: {
      fullName: "Admin BatterySwap",
      email: "admin@batteryswap.local",
      phone: "0900000001",
      passwordHash,
      roleId: roleByName.get(RoleName.ADMIN)!.id,
    },
  });

  const member = await prisma.user.create({
    data: {
      fullName: "Nguyen Tuan Anh",
      email: "member@batteryswap.local",
      phone: "0900000002",
      rfidCard: "RFID-9921",
      licensePlate: "29A-12345",
      passwordHash,
      roleId: roleByName.get(RoleName.MEMBER)!.id,
      wallet: {
        create: { balance: 250000 },
      },
    },
  });

  await prisma.vehicle.createMany({
    data: [
      {
        userId: member.id,
        name: "VinFast Feliz S",
        plateNumber: "29A-12345",
        vinNumber: "VF-FELIZ-0001",
        batteryType: "LFP 72V",
        batteryCount: 1,
        status: VehicleStatus.ACTIVE,
      },
      {
        userId: member.id,
        name: "VinFast Klara S",
        plateNumber: "59A1-67890",
        vinNumber: "VF-KLARA-0001",
        batteryType: "Lithium 72V",
        batteryCount: 2,
        status: VehicleStatus.ACTIVE,
      },
    ],
  });

  await prisma.user.createMany({
    data: [
      {
        fullName: "Staff Station",
        email: "staff@batteryswap.local",
        phone: "0900000003",
        passwordHash,
        roleId: roleByName.get(RoleName.STAFF)!.id,
      },
      {
        fullName: "Technician Battery",
        email: "technician@batteryswap.local",
        phone: "0900000004",
        passwordHash,
        roleId: roleByName.get(RoleName.TECHNICIAN)!.id,
      },
      {
        fullName: "Manager Operation",
        email: "manager@batteryswap.local",
        phone: "0900000005",
        passwordHash,
        roleId: roleByName.get(RoleName.MANAGER)!.id,
      },
    ],
  });

  const stationOne = await prisma.station.create({
    data: {
      name: "GreenCharge Quan 1",
      address: "120 Le Lai, Quan 1, TP. HCM",
      latitude: 10.7719,
      longitude: 106.6917,
      status: StationStatus.ACTIVE,
      slots: {
        create: [
          { slotNumber: 1, status: SlotStatus.READY },
          { slotNumber: 2, status: SlotStatus.CHARGING },
          { slotNumber: 3, status: SlotStatus.EMPTY },
        ],
      },
    },
    include: { slots: true },
  });

  const stationTwo = await prisma.station.create({
    data: {
      name: "GreenCharge Quan 7",
      address: "56 Nguyen Thi Thap, Quan 7, TP. HCM",
      latitude: 10.7412,
      longitude: 106.7013,
      status: StationStatus.ACTIVE,
      slots: {
        create: [
          { slotNumber: 1, status: SlotStatus.READY },
          { slotNumber: 2, status: SlotStatus.MAINTENANCE },
          { slotNumber: 3, status: SlotStatus.READY },
        ],
      },
    },
    include: { slots: true },
  });

  const slot = (slots: typeof stationOne.slots, slotNumber: number) =>
    slots.find((item) => item.slotNumber === slotNumber)!.id;

  await prisma.battery.createMany({
    data: [
      {
        serialNumber: "B001",
        soc: 98,
        soh: 95,
        temperature: 35,
        voltage: 48,
        type: "LFP 72V",
        status: BatteryStatus.READY,
        slotId: slot(stationOne.slots, 1),
      },
      {
        serialNumber: "B002",
        soc: 45,
        soh: 92,
        temperature: 42,
        voltage: 46,
        type: "LFP 72V",
        status: BatteryStatus.CHARGING,
        slotId: slot(stationOne.slots, 2),
      },
      {
        serialNumber: "B003",
        soc: 100,
        soh: 97,
        temperature: 33,
        voltage: 48,
        type: "Lithium 72V",
        status: BatteryStatus.READY,
        slotId: slot(stationTwo.slots, 1),
      },
      {
        serialNumber: "B004",
        soc: 10,
        soh: 60,
        temperature: 55,
        voltage: 40,
        type: "LFP 72V",
        status: BatteryStatus.MAINTENANCE,
        slotId: slot(stationTwo.slots, 2),
      },
      {
        serialNumber: "B005",
        soc: 99,
        soh: 96,
        temperature: 34,
        voltage: 48,
        type: "Lithium 72V",
        status: BatteryStatus.READY,
        slotId: slot(stationTwo.slots, 3),
      },
    ],
  });

  const batteries = await prisma.battery.findMany({
    where: {
      serialNumber: {
        in: ["B001", "B002", "B004"],
      },
    },
  });
  const batteryBySerial = new Map(batteries.map((battery) => [battery.serialNumber, battery]));

  await prisma.batteryHealthLog.createMany({
    data: [
      {
        batteryId: batteryBySerial.get("B001")!.id,
        soc: 98,
        soh: 95,
        temperature: 35,
        voltage: 48,
        severity: MaintenanceSeverity.LOW,
        errorCode: null,
        errorLog: "Normal operating condition.",
      },
      {
        batteryId: batteryBySerial.get("B002")!.id,
        soc: 45,
        soh: 92,
        temperature: 48,
        voltage: 46,
        severity: MaintenanceSeverity.WARNING,
        errorCode: "TEMP_WARN",
        errorLog: "Charging temperature is above normal threshold.",
      },
      {
        batteryId: batteryBySerial.get("B004")!.id,
        soc: 10,
        soh: 60,
        temperature: 62,
        voltage: 40,
        severity: MaintenanceSeverity.CRITICAL,
        errorCode: "SOH_LOW_TEMP_HIGH",
        errorLog: "Battery has low health and critical temperature during charging.",
      },
    ],
  });

  await prisma.subscriptionPackage.createMany({
    data: [
      {
        name: "Eco",
        price: 150000,
        description: "5 swaps per month",
        monthlyLimit: 5,
      },
      {
        name: "Unlimited",
        price: 350000,
        description: "Unlimited monthly swaps",
        isUnlimited: true,
      },
    ],
  });

  await prisma.systemSetting.createMany({
    data: [
      {
        key: "STANDARD_SWAP_PRICE",
        value: "45000",
        description: "Standard single battery swap price in VND",
      },
      {
        key: "BOOKING_EXPIRY_MINUTES",
        value: "30",
        description: "Default booking reservation expiry time",
      },
    ],
  });

  await prisma.auditLog.create({
    data: {
      adminId: admin.id,
      action: "SEED_DATABASE",
      details: `Seeded demo data for member ${member.email}`,
    },
  });

  console.log("Seed completed. Demo password for all users: 123456");
};

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
