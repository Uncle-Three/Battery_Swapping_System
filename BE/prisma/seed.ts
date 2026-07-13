import {
  PrismaClient,
  RoleName,
  BatteryStatus,
  SlotStatus,
  StationStatus,
  MaintenanceSeverity,
  VehicleStatus,
  BatteryOperationalStatus,
  BatterySafetyState,
  StationAssignmentRole,
  ReplacementRequestStatus,
} from "@prisma/client";
import bcrypt from "bcrypt";
import { Permissions, PermissionWildcard, RolePermissions } from "../src/constants/permissions";

const prisma = new PrismaClient();

if (process.env.NODE_ENV === "production") {
  throw new Error("Development seed is disabled in production");
}

const main = async () => {
  const passwordHash = await bcrypt.hash("123456", 12);

  await prisma.auditLog.deleteMany();
  await prisma.swapStepHistory.deleteMany();
  await prisma.batteryInspection.deleteMany();
  await prisma.bookingApprovalHistory.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.batteryLifecycleEvent.deleteMany();
  await prisma.replacementRequest.deleteMany();
  await prisma.slotReservation.deleteMany();
  await prisma.batteryReservation.deleteMany();
  await prisma.vehicleBatteryAssignment.deleteMany();
  await prisma.stationAssignment.deleteMany();
  await prisma.batteryCompatibility.deleteMany();
  await prisma.batterySafetyRule.deleteMany();
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
  await prisma.vehicleModel.deleteMany();
  await prisma.batteryType.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.role.deleteMany();

  const roles = await Promise.all(
    Object.values(RoleName).map((name) =>
      prisma.role.create({
        data: { name },
      }),
    ),
  );

  const roleByName = new Map(roles.map((role) => [role.name, role]));

  const permissionCodes = Object.values(Permissions);
  await prisma.permission.createMany({ data: permissionCodes.map((code) => ({ code })) });
  const permissions = await prisma.permission.findMany();
  const permissionByCode = new Map(permissions.map((permission) => [permission.code, permission]));
  for (const role of roles) {
    const configuredGrants = role.name === RoleName.GUEST
      ? []
      : RolePermissions[role.name as keyof typeof RolePermissions];
    const grants: readonly string[] = (configuredGrants as readonly string[]).includes(PermissionWildcard)
      ? permissionCodes
      : configuredGrants;
    if (grants.length > 0) {
      await prisma.rolePermission.createMany({
        data: grants.map((code) => ({ roleId: role.id, permissionId: permissionByCode.get(code)!.id })),
      });
    }
  }

  const vehicleModel = await prisma.vehicleModel.create({
    data: {
      manufacturer: "VinFast",
      name: "VF 8 Eco",
      modelYear: 2026,
      connectorType: "VINFAST-PACK-V2",
      nominalVoltage: 400,
      batteryClass: "EV-SUV-MID",
    },
  });
  const batteryType = await prisma.batteryType.create({
    data: {
      code: "VF8-LFP-82KWH",
      manufacturer: "VinES",
      chemistry: "LFP",
      connectorType: "VINFAST-PACK-V2",
      nominalVoltage: 400,
      capacityKWh: 82,
      batteryClass: "EV-SUV-MID",
    },
  });
  await prisma.batteryCompatibility.create({
    data: {
      vehicleModelId: vehicleModel.id,
      batteryTypeId: batteryType.id,
      connectorType: "VINFAST-PACK-V2",
      nominalVoltage: 400,
      minimumCapacityKWh: 80,
      maximumCapacityKWh: 85,
      batteryClass: "EV-SUV-MID",
    },
  });

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
      licensePlate: "51K-12345",
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
        name: "VinFast VF 8 Eco",
        plateNumber: "51K-12345",
        vinNumber: "RLVFV8ECO00000001",
        batteryType: "VF8-LFP-82KWH",
        vehicleModelId: vehicleModel.id,
        batteryCount: 1,
        status: VehicleStatus.ACTIVE,
      },
      {
        userId: member.id,
        name: "VinFast VF 8 Eco Fleet",
        plateNumber: "51K-67890",
        vinNumber: "RLVFV8ECO00000002",
        batteryType: "VF8-LFP-82KWH",
        vehicleModelId: vehicleModel.id,
        batteryCount: 1,
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
      code: "ST-HCM-01",
      name: "GreenCharge Quan 1",
      address: "120 Le Lai, Quan 1, TP. HCM",
      latitude: 10.7719,
      longitude: 106.6917,
      status: StationStatus.ACTIVE,
      slots: {
        create: [
          { slotNumber: 1, status: SlotStatus.READY },
          { slotNumber: 2, status: SlotStatus.READY },
          { slotNumber: 3, status: SlotStatus.EMPTY },
        ],
      },
    },
    include: { slots: true },
  });

  const stationTwo = await prisma.station.create({
    data: {
      code: "ST-HCM-02",
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

  const assignedUsers = await prisma.user.findMany({ where: { email: { in: ["staff@batteryswap.local", "technician@batteryswap.local", "manager@batteryswap.local"] } } });
  const assignedUserByEmail = new Map(assignedUsers.map((user) => [user.email, user]));
  await prisma.stationAssignment.createMany({ data: [
    { userId: assignedUserByEmail.get("staff@batteryswap.local")!.id, stationId: stationOne.id, assignmentRole: StationAssignmentRole.STAFF },
    { userId: assignedUserByEmail.get("technician@batteryswap.local")!.id, stationId: stationOne.id, assignmentRole: StationAssignmentRole.TECHNICIAN },
    { userId: assignedUserByEmail.get("manager@batteryswap.local")!.id, stationId: stationOne.id, assignmentRole: StationAssignmentRole.MANAGER },
  ] });
  await prisma.batterySafetyRule.create({ data: {
    version: 1,
    minimumSohSafe: 80,
    minimumSohWarning: 70,
    minimumSoc: 10,
    maximumTemperature: 55,
    minimumVoltage: 320,
    maximumVoltage: 450,
    effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
  } });

  const slot = (slots: any[], slotNumber: number) =>
    slots.find((item) => item.slotNumber === slotNumber)!.id;

  await prisma.battery.createMany({
    data: [
      {
        batteryCode: "BAT-B001", serialNumber: "B001",
        soc: 98,
        soh: 95,
        temperature: 35,
        voltage: 401,
        type: "VF8-LFP-82KWH",
        batteryTypeId: batteryType.id,
        stationId: stationOne.id,
        cycleCount: 180,
        safetyState: BatterySafetyState.SAFE,
        operationalStatus: BatteryOperationalStatus.AVAILABLE,
        status: BatteryStatus.READY,
        slotId: slot(stationOne.slots, 1),
      },
      {
        batteryCode: "BAT-B002", serialNumber: "B002",
        soc: 45,
        soh: 92,
        temperature: 42,
        voltage: 389,
        type: "VF8-LFP-82KWH",
        batteryTypeId: batteryType.id,
        stationId: stationOne.id,
        cycleCount: 420,
        safetyState: BatterySafetyState.SAFE,
        operationalStatus: BatteryOperationalStatus.AVAILABLE,
        status: BatteryStatus.CHARGING,
        slotId: slot(stationOne.slots, 2),
      },
      {
        batteryCode: "BAT-B003", serialNumber: "B003",
        soc: 100,
        soh: 97,
        temperature: 33,
        voltage: 403,
        type: "VF8-LFP-82KWH",
        batteryTypeId: batteryType.id,
        stationId: stationTwo.id,
        cycleCount: 120,
        safetyState: BatterySafetyState.SAFE,
        operationalStatus: BatteryOperationalStatus.AVAILABLE,
        status: BatteryStatus.READY,
        slotId: slot(stationTwo.slots, 1),
      },
      {
        batteryCode: "BAT-B004", serialNumber: "B004",
        soc: 10,
        soh: 60,
        temperature: 55,
        voltage: 315,
        type: "VF8-LFP-82KWH",
        batteryTypeId: batteryType.id,
        stationId: stationTwo.id,
        cycleCount: 1100,
        safetyState: BatterySafetyState.UNSAFE,
        operationalStatus: BatteryOperationalStatus.QUARANTINED,
        status: BatteryStatus.MAINTENANCE,
        slotId: slot(stationTwo.slots, 2),
      },
      {
        batteryCode: "BAT-B005", serialNumber: "B005",
        soc: 99,
        soh: 96,
        temperature: 34,
        voltage: 400,
        type: "VF8-LFP-82KWH",
        batteryTypeId: batteryType.id,
        stationId: stationTwo.id,
        cycleCount: 90,
        safetyState: BatterySafetyState.SAFE,
        operationalStatus: BatteryOperationalStatus.AVAILABLE,
        status: BatteryStatus.READY,
        slotId: slot(stationTwo.slots, 3),
      },
      {
        batteryCode: "BAT-VF8-INSTALLED-001", serialNumber: "VF8-INSTALLED-001",
        soc: 72,
        soh: 88,
        temperature: 36,
        voltage: 398,
        type: "VF8-LFP-82KWH",
        batteryTypeId: batteryType.id,
        cycleCount: 260,
        safetyState: BatterySafetyState.SAFE,
        operationalStatus: BatteryOperationalStatus.INSTALLED,
        status: BatteryStatus.READY,
        lastHealthCheckAt: new Date(),
      },
      {
        batteryCode: "BAT-VF8-INSTALLED-UNSAFE-001", serialNumber: "VF8-INSTALLED-UNSAFE-001",
        soc: 18,
        soh: 62,
        temperature: 58,
        voltage: 310,
        type: "VF8-LFP-82KWH",
        batteryTypeId: batteryType.id,
        cycleCount: 1180,
        safetyState: BatterySafetyState.UNSAFE,
        operationalStatus: BatteryOperationalStatus.INSTALLED,
        status: BatteryStatus.FAULTY,
        lastHealthCheckAt: new Date(),
      },
    ],
  });

  const batteries = await prisma.battery.findMany({
    where: {
      serialNumber: {
        in: ["B001", "B002", "B004", "VF8-INSTALLED-001", "VF8-INSTALLED-UNSAFE-001"],
      },
    },
  });
  const batteryBySerial = new Map(batteries.map((battery) => [battery.serialNumber, battery]));
  const memberVehicle = await prisma.vehicle.findFirstOrThrow({ where: { userId: member.id }, orderBy: { createdAt: "asc" } });
  await prisma.vehicleBatteryAssignment.create({
    data: {
      vehicleId: memberVehicle.id,
      batteryId: batteryBySerial.get("VF8-INSTALLED-001")!.id,
      active: true,
    },
  });
  const unsafeVehicle = await prisma.vehicle.findFirstOrThrow({ where: { userId: member.id, id: { not: memberVehicle.id } } });
  await prisma.vehicle.update({ where: { id: unsafeVehicle.id }, data: { status: VehicleStatus.INACTIVE } });
  await prisma.vehicleBatteryAssignment.create({ data: { vehicleId: unsafeVehicle.id, batteryId: batteryBySerial.get("VF8-INSTALLED-UNSAFE-001")!.id, active: true } });
  const mandatoryRequest = await prisma.replacementRequest.create({ data: {
    vehicleId: unsafeVehicle.id,
    batteryId: batteryBySerial.get("VF8-INSTALLED-UNSAFE-001")!.id,
    reason: "Battery SOH, temperature, and voltage are outside the configured safety limits",
    mandatory: true,
    priority: 100,
    safetySnapshot: { measurements: { soh: 62, soc: 18, temperature: 58, voltage: 310, cycleCount: 1180 }, ruleVersion: 1 },
    status: ReplacementRequestStatus.USER_NOTIFIED,
    deduplicationKey: `mandatory:${batteryBySerial.get("VF8-INSTALLED-UNSAFE-001")!.id}`,
  } });
  await prisma.notification.create({ data: { userId: member.id, type: "MANDATORY_REPLACEMENT", title: "Mandatory battery replacement", message: "Mandatory battery replacement is required.", entityType: "ReplacementRequest", entityId: mandatoryRequest.id, metadata: { vehicleId: unsafeVehicle.id, priority: 100 } } });

  await prisma.batteryHealthLog.createMany({
    data: [
      {
        batteryId: batteryBySerial.get("B001")!.id,
        soc: 98,
        soh: 95,
        temperature: 35,
        voltage: 401,
        cycleCount: 180,
        dataSource: "BMS_SEED",
        safetyState: BatterySafetyState.SAFE,
        ruleVersion: 1,
        ruleSnapshot: { minimumSohSafe: 80, minimumSohWarning: 70, maximumTemperature: 55 },
        severity: MaintenanceSeverity.LOW,
        errorCode: null,
        errorLog: "Normal operating condition.",
      },
      {
        batteryId: batteryBySerial.get("B002")!.id,
        soc: 45,
        soh: 92,
        temperature: 48,
        voltage: 389,
        cycleCount: 420,
        dataSource: "BMS_SEED",
        safetyState: BatterySafetyState.SAFE,
        ruleVersion: 1,
        ruleSnapshot: { minimumSohSafe: 80, minimumSohWarning: 70, maximumTemperature: 55 },
        severity: MaintenanceSeverity.WARNING,
        errorCode: "TEMP_WARN",
        errorLog: "Charging temperature is above normal threshold.",
      },
      {
        batteryId: batteryBySerial.get("B004")!.id,
        soc: 10,
        soh: 60,
        temperature: 62,
        voltage: 315,
        cycleCount: 1100,
        dataSource: "BMS_SEED",
        safetyState: BatterySafetyState.UNSAFE,
        ruleVersion: 1,
        ruleSnapshot: { minimumSohSafe: 80, minimumSohWarning: 70, maximumTemperature: 55 },
        severity: MaintenanceSeverity.CRITICAL,
        errorCode: "SOH_LOW_TEMP_HIGH",
        errorLog: "Battery has low health and critical temperature during charging.",
      },
      {
        batteryId: batteryBySerial.get("VF8-INSTALLED-001")!.id,
        soc: 72, soh: 88, temperature: 36, voltage: 398, cycleCount: 260,
        dataSource: "BMS_SEED", safetyState: BatterySafetyState.SAFE, ruleVersion: 1,
        ruleSnapshot: { minimumSohSafe: 80, minimumSohWarning: 70, minimumSoc: 10, maximumTemperature: 55, minimumVoltage: 320, maximumVoltage: 450 },
        recordedAt: new Date(Date.now() - 24 * 60 * 60_000),
      },
      {
        batteryId: batteryBySerial.get("VF8-INSTALLED-001")!.id,
        soc: 72, soh: 88, temperature: 36, voltage: 398, cycleCount: 260,
        dataSource: "BMS_SEED", safetyState: BatterySafetyState.SAFE, ruleVersion: 1,
        ruleSnapshot: { minimumSohSafe: 80, minimumSohWarning: 70, minimumSoc: 10, maximumTemperature: 55, minimumVoltage: 320, maximumVoltage: 450 },
      },
      {
        batteryId: batteryBySerial.get("VF8-INSTALLED-UNSAFE-001")!.id,
        soc: 18, soh: 62, temperature: 58, voltage: 310, cycleCount: 1180,
        dataSource: "BMS_SEED", safetyState: BatterySafetyState.UNSAFE, ruleVersion: 1,
        ruleSnapshot: { minimumSohSafe: 80, minimumSohWarning: 70, minimumSoc: 10, maximumTemperature: 55, minimumVoltage: 320, maximumVoltage: 450 },
        severity: MaintenanceSeverity.CRITICAL,
        errorCode: "SOH_LOW_TEMP_HIGH_VOLTAGE_LOW",
        errorLog: "Installed battery is unsafe and requires mandatory replacement.",
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
