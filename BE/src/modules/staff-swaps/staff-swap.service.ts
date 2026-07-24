import {
  BatteryHealthSource,
  BatteryOperationalStatus,
  BayTimeSlotStatus,
  BookingStatus,
  InvoiceStatus,
  NotificationType,
  PaymentMethod,
  ReplacementRequestStatus,
  ReservationStatus,
  SwapStatus,
  type Prisma,
} from "@prisma/client";
import { prisma } from "../../config/database";
import { Roles } from "../../constants/roles";
import { ForbiddenError } from "../../common/errors/forbidden-error";
import { NotFoundError } from "../../common/errors/not-found-error";
import { AppError } from "../../common/errors/app-error";
import {
  assertBookingTransition,
  assertSwapTransition,
} from "../../common/state-machines/transitions";
import {
  calculateBatterySoh,
  classifyBatterySoh,
  inferAccumulatedMileageKm,
} from "../battery-health/battery-soh";
import { emailService } from "../email/email.service";
import { env } from "../../config/env";
import { paymentService } from "../payments/payment.service";

const assertStaffScope = async (
  staffId: string,
  role: string,
  stationId: string,
) => {
  if (role === Roles.ADMIN) return;
  const assignments = await prisma.stationAssignment.findMany({
    where: {
      userId: staffId,
      assignmentRole: { in: ["STAFF", "MANAGER"] },
      active: true,
    },
    select: {
      stationId: true,
      assignmentRole: true,
      effectiveFrom: true,
      effectiveTo: true,
    },
    orderBy: { effectiveFrom: "desc" },
  });
  const now = new Date();
  const activeAssignments = assignments.filter(
    (assignment) =>
      assignment.effectiveFrom <= now &&
      (!assignment.effectiveTo || assignment.effectiveTo > now),
  );
  const allowed =
    role === Roles.STAFF
      ? activeAssignments[0]?.stationId === stationId
      : activeAssignments.some(
          (assignment) => assignment.stationId === stationId,
        );
  if (!allowed)
    throw new ForbiddenError("Staff is not assigned to this station");
};

const nextActions: Record<SwapStatus, string[]> = {
  NOT_STARTED: ["VERIFY"],
  VERIFIED: ["REMOVE_OLD_BATTERY"],
  OLD_BATTERY_REMOVED: ["ASSIGN_REPLACEMENT"],
  OLD_BATTERY_INSPECTED: ["ASSIGN_REPLACEMENT"],
  REPLACEMENT_ASSIGNED: ["INSTALL"],
  INSTALLED: ["COLLECT_PAYMENT"],
  PAYMENT_PENDING: [],
  COMPLETED: [],
  FAILED: ["ROLLBACK"],
  ROLLED_BACK: [],
};

const round = (value: number, digits = 2) => Number(value.toFixed(digits));

const normalizeBatteryIdentifier = (value?: string | null): string => {
  const raw = value?.trim();
  if (!raw) return "";
  const queryMatch = raw.match(/[?&]batteryCode=([^&#]+)/i);
  if (queryMatch?.[1]) {
    try {
      return decodeURIComponent(queryMatch[1]).trim().toUpperCase();
    } catch {
      return queryMatch[1].trim().toUpperCase();
    }
  }
  const pathValue = raw.split(/[?#]/)[0].split("/").filter(Boolean).pop() ?? raw;
  try {
    return decodeURIComponent(pathValue).trim().toUpperCase();
  } catch {
    return pathValue.trim().toUpperCase();
  }
};

const batteryMatchesIdentifier = (
  battery: {
    id?: string;
    serialNumber?: string | null;
    batteryCode?: string | null;
    qrCodeValue?: string | null;
  },
  input: string,
): boolean => {
  const expected = normalizeBatteryIdentifier(input);
  return [battery.id, battery.serialNumber, battery.batteryCode, battery.qrCodeValue]
    .some((value) => normalizeBatteryIdentifier(value) === expected);
};

const estimateHealth = (battery: {
  soh: number;
  accumulatedMileageKm?: number | null;
  activatedDate?: Date | null;
  manufacturedDate?: Date | null;
}) => {
  const mileageKm = battery.accumulatedMileageKm ?? 0;
  const mileageSoh = calculateBatterySoh(mileageKm);
  const ageStart = battery.activatedDate ?? battery.manufacturedDate;
  const ageYears = ageStart
    ? Math.max(
        0,
        (Date.now() - ageStart.getTime()) / (365 * 24 * 60 * 60 * 1000),
      )
    : 0;
  const estimatedSoh = round(Math.min(battery.soh ?? 100, mileageSoh));
  return {
    estimatedSoh,
    accumulatedMileageKm: round(mileageKm),
    ageYears: round(ageYears, 1),
    healthClassification: classifyBatterySoh(estimatedSoh),
    source: BatteryHealthSource.LIFECYCLE_SIMULATION,
    explanation:
      "Chỉ số SOH thực tế của pin. Nhân viên có thể điều chỉnh SOH sau khi kiểm tra kỹ thuật.",
  };
};

const getContext = async (staffId: string, role: string) => {
  const stationSelect = {
    id: true,
    name: true,
    address: true,
    serviceBays: {
      where: { status: "AVAILABLE" as const },
      select: {
        id: true,
        bayCode: true,
        bayName: true,
        status: true,
        defaultDurationMinutes: true,
        bookings: {
          where: { status: BookingStatus.APPROVED },
          select: {
            id: true,
            stationId: true,
            serviceBayId: true,
            status: true,
            scheduledStart: true,
            scheduledEnd: true,
            mandatory: true,
            reason: true,
            user: { select: { fullName: true, email: true, phone: true } },
            vehicle: {
              select: { name: true, plateNumber: true, batteryType: true },
            },
            battery: { select: { serialNumber: true } },
          },
          orderBy: { scheduledStart: "asc" as const },
        },
      },
      orderBy: { bayCode: "asc" as const },
    },
  };
  if (role === Roles.ADMIN) {
    const stations = await prisma.station.findMany({
      where: { status: "ACTIVE" },
      select: stationSelect,
      orderBy: { name: "asc" },
    });
    return { stations, activeSwap: null };
  }
  const assignments = await prisma.stationAssignment.findMany({
    where: {
      userId: staffId,
      assignmentRole: { in: ["STAFF", "MANAGER"] },
      active: true,
    },
    select: { stationId: true, effectiveFrom: true, effectiveTo: true },
    orderBy: { effectiveFrom: "desc" },
  });
  const now = new Date();
  const stationIds = [
    ...new Set(
      assignments
        .filter(
          (item) =>
            item.effectiveFrom <= now &&
            (!item.effectiveTo || item.effectiveTo > now),
        )
        .map((item) => item.stationId),
    ),
  ];
  if (role === Roles.STAFF && stationIds.length > 1) stationIds.splice(1);

  const stations = await prisma.station.findMany({
    where: { id: { in: stationIds }, status: "ACTIVE" },
    select: stationSelect,
    orderBy: { name: "asc" },
  });
  let activeSwap = null;
  if (role !== Roles.ADMIN) {
    activeSwap = await prisma.swapTransaction.findFirst({
      where: {
        staffId,
        workflowStatus: {
          notIn: [
            SwapStatus.COMPLETED,
            SwapStatus.FAILED,
            SwapStatus.ROLLED_BACK,
          ],
        },
      },
      include: {
        station: true,
        booking: {
          include: {
            user: { select: { fullName: true, email: true } },
            vehicle: true,
          },
        },
      },
    });
  }

  return { stations, activeSwap };
};

const history = async (staffId: string, role: string) => {
  const context = await getContext(staffId, role);
  const stationIds =
    role === Roles.ADMIN
      ? undefined
      : context.stations.map((station) => station.id);
  return prisma.swapTransaction.findMany({
    where: stationIds ? { stationId: { in: stationIds } } : {},
    include: {
      station: true,
      booking: {
        include: {
          user: { select: { fullName: true, email: true } },
          vehicle: true,
        },
      },
      batteryIn: true,
      batteryOut: true,
      inspection: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
};

const lookup = async (
  bookingId: string,
  stationId: string,
  staffId: string,
  role: string,
) => {
  await assertStaffScope(staffId, role, stationId);
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, stationId },
    include: {
      user: { select: { id: true, fullName: true, phone: true, email: true } },
      vehicle: {
        include: {
          batteryAssignments: {
            where: { active: true },
            take: 1,
            include: { battery: true },
          },
        },
      },
      battery: true,
      station: true,
      serviceBay: true,
      transactions: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!booking) throw new NotFoundError("Booking not found at this station");
  return booking;
};

const checkIn = async (
  bookingId: string,
  stationId: string,
  serviceBayId: string,
  staffId: string,
  role: string,
) => {
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, stationId },
    include: {
      bayReservations: { where: { status: ReservationStatus.ACTIVE }, take: 1 },
      vehicle: true,
      user: { select: { id: true, fullName: true, email: true, phone: true } },
      station: { select: { id: true, code: true, name: true, address: true } },
    },
  });
  if (!booking) throw new NotFoundError("Booking not found at this station");
  await assertStaffScope(staffId, role, stationId);

  const existingActive = await prisma.swapTransaction.findFirst({
    where: {
      staffId,
      workflowStatus: {
        notIn: [
          SwapStatus.COMPLETED,
          SwapStatus.FAILED,
          SwapStatus.ROLLED_BACK,
        ],
      },
    },
  });
  if (existingActive)
    throw new AppError(
      "Bạn phải hoàn tất quá trình thay pin đang thực hiện trước khi nhận thêm xe mới",
      409,
    );

  assertBookingTransition(booking.status, BookingStatus.CHECKED_IN);
  if (!booking.vehicleId) throw new AppError("Booking is missing vehicle", 409);
  if (booking.serviceBayId !== serviceBayId)
    throw new AppError(
      "Booking is not assigned to the selected service bay",
      409,
    );
  const serviceBay = await prisma.serviceBay.findFirst({
    where: { id: serviceBayId, stationId, status: "AVAILABLE" },
  });
  if (!serviceBay)
    throw new AppError(
      "Selected service bay is not available at this station",
      409,
    );
  if (!booking.scheduledStart || !booking.scheduledEnd)
    throw new AppError("Booking is missing its scheduled time", 409);
  const activeBayReservation = booking.bayReservations.find(
    (reservation) => reservation.serviceBayId === serviceBayId,
  );
  if (!activeBayReservation)
    throw new AppError(
      "Selected service bay no longer has an active reservation for this booking",
      409,
    );
  const now = new Date();
  if (
    process.env.NODE_ENV === "production" &&
    process.env.E2E_TEST !== "true" &&
    booking.scheduledStart &&
    now < new Date(booking.scheduledStart.getTime() - 30 * 60_000)
  )
    throw new AppError(
      "Check-in is only allowed 30 minutes before the appointment",
      409,
    );
  const existing = await prisma.swapTransaction.findFirst({
    where: { bookingId },
  });
  if (existing)
    throw new AppError("A swap workflow already exists for this booking", 409);
  const staffSnapshot = await prisma.user?.findUnique({
    where: { id: staffId },
    select: { id: true, fullName: true },
  });
  return prisma.$transaction(async (tx) => {
    await tx.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.CHECKED_IN, serviceBayId },
    });
    await tx.bayTimeSlot?.updateMany({
      where: { bookingId, status: BayTimeSlotStatus.RESERVED },
      data: { status: BayTimeSlotStatus.CHECKED_IN },
    });
    await tx.slotReservation.updateMany({
      where: { bookingId, status: ReservationStatus.ACTIVE },
      data: { status: ReservationStatus.CONSUMED },
    });
    const swap = await tx.swapTransaction.create({
      data: {
        bookingId,
        userId: booking.userId,
        vehicleId: booking.vehicleId!,
        stationId,
        staffId,
        workflowStatus: SwapStatus.NOT_STARTED,
        status: "SUCCESS",
        vehicleSnapshot: booking.vehicle
          ? {
              id: booking.vehicle.id,
              plateNumber: booking.vehicle.plateNumber,
              vinNumber: booking.vehicle.vinNumber,
              model: booking.vehicle.model,
              brand: booking.vehicle.brand,
              batteryType: booking.vehicle.batteryType,
              odo: booking.vehicle.currentMileageKm,
              station: booking.station,
              staff: staffSnapshot,
            }
          : undefined,
        ownerSnapshot: booking.user
          ? {
              id: booking.user.id,
              fullName: booking.user.fullName,
              email: booking.user.email,
              phone: booking.user.phone,
            }
          : undefined,
      },
    });
    await tx.swapStepHistory.create({
      data: {
        swapTransactionId: swap.id,
        actorId: staffId,
        toStatus: SwapStatus.NOT_STARTED,
        data: {
          action: "CHECK_IN",
          bookingId,
          serviceBayId,
          bayCode: serviceBay.bayCode,
        },
      },
    });
    return swap;
  });
};

const getScopedSwap = async (id: string, staffId: string, role: string) => {
  const swap = await prisma.swapTransaction.findUnique({
    where: { id },
    include: {
      booking: {
        include: {
          user: { select: { fullName: true, email: true, phone: true } },
          vehicle: true,
          battery: true,
        },
      },
      vehicle: true,
      batteryIn: true,
      batteryOut: true,
      inspection: true,
      stepHistory: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!swap) throw new NotFoundError("Swap transaction not found");
  await assertStaffScope(staffId, role, swap.stationId);
  return { ...swap, nextActions: nextActions[swap.workflowStatus] };
};

const move = async (
  tx: Prisma.TransactionClient,
  id: string,
  actorId: string,
  from: SwapStatus,
  to: SwapStatus,
  data?: Prisma.InputJsonValue,
) => {
  assertSwapTransition(from, to);
  const updated = await tx.swapTransaction.update({
    where: { id },
    data: { workflowStatus: to },
  });
  await tx.swapStepHistory.create({
    data: {
      swapTransactionId: id,
      actorId,
      fromStatus: from,
      toStatus: to,
      data,
    },
  });
  return updated;
};

const verify = async (id: string, staffId: string, role: string) => {
  const swap = await getScopedSwap(id, staffId, role);
  if (
    !swap.booking ||
    !swap.vehicleId ||
    swap.booking.userId !== swap.userId ||
    swap.booking.vehicleId !== swap.vehicleId
  )
    throw new AppError("Booking identity or vehicle does not match", 409);
  const assignment = await prisma.vehicleBatteryAssignment.findFirst({
    where: { vehicleId: swap.vehicleId, active: true },
    include: { battery: true },
  });
  if (!assignment)
    throw new AppError("Vehicle has no active battery assignment", 409);
  return prisma.$transaction((tx) =>
    move(tx, id, staffId, swap.workflowStatus, SwapStatus.VERIFIED, {
      vehicleBatterySerial: assignment.battery.serialNumber,
    }),
  );
};

const scanBattery = async (
  id: string,
  staffId: string,
  role: string,
  serialNumber: string,
) => {
  const swap = await getScopedSwap(id, staffId, role);
  let battery = await prisma.battery.findFirst({
    where: {
      OR: [
        { serialNumber },
        { batteryCode: serialNumber },
        { qrCodeValue: serialNumber },
      ],
    },
    include: {
      batteryType: true,
      station: { select: { id: true, name: true } },
    },
  });

  if (!battery) {
    const knownBattery = [swap.batteryIn, swap.batteryOut, swap.booking?.battery]
      .find((candidate) => candidate && batteryMatchesIdentifier(candidate, serialNumber));
    if (knownBattery) {
      battery = await prisma.battery.findFirst({
        where: { id: knownBattery.id },
        include: {
          batteryType: true,
          station: { select: { id: true, name: true } },
        },
      });
    }
  }

  if (!battery && swap.vehicleId) {
    const installedAssignment = await prisma.vehicleBatteryAssignment.findFirst({
      where: { vehicleId: swap.vehicleId, active: true },
      include: {
        battery: {
          include: {
            batteryType: true,
            station: { select: { id: true, name: true } },
          },
        },
      },
    });
    if (
      installedAssignment?.battery &&
      batteryMatchesIdentifier(installedAssignment.battery, serialNumber)
    ) {
      battery = installedAssignment.battery;
    }
  }

  if (!battery) throw new NotFoundError("Battery not found from scanned code");

  const activeAssignment = swap.vehicleId
    ? await prisma.vehicleBatteryAssignment.findFirst({
        where: {
          vehicleId: swap.vehicleId,
          batteryId: battery.id,
          active: true,
        },
      })
    : null;
  const isRemovedBattery = swap.batteryInId === battery.id;
  const isReplacementBattery =
    (swap.batteryOutId ?? swap.booking?.batteryId) === battery.id;
  const expectedForCurrentStep =
    (swap.workflowStatus === SwapStatus.VERIFIED &&
      Boolean(activeAssignment)) ||
    (swap.workflowStatus === SwapStatus.OLD_BATTERY_REMOVED &&
      isReplacementBattery) ||
    (swap.workflowStatus === SwapStatus.OLD_BATTERY_INSPECTED &&
      isReplacementBattery) ||
    (swap.workflowStatus === SwapStatus.REPLACEMENT_ASSIGNED &&
      isReplacementBattery);

  return {
    battery: {
      id: battery.id,
      batteryCode: battery.batteryCode,
      qrCodeValue: battery.qrCodeValue,
      serialNumber: battery.serialNumber,
      soc: battery.soc,
      soh: battery.soh,
      temperature: battery.temperature,
      voltage: battery.voltage,
      cycleCount: battery.cycleCount,
      type: battery.type,
      batteryType: battery.batteryType,
      station: battery.station,
      operationalStatus: battery.operationalStatus,
      safetyState: battery.safetyState,
      healthClassification: battery.healthClassification,
      healthSource: battery.healthSource,
      accumulatedMileageKm: battery.accumulatedMileageKm,
      activatedDate: battery.activatedDate,
      manufacturedDate: battery.manufacturedDate,
      lastHealthCheckAt: battery.lastHealthCheckAt,
    },
    estimate: estimateHealth(battery),
    expectedForCurrentStep,
  };
};

const removeOldBattery = async (
  id: string,
  staffId: string,
  role: string,
  input: { serialNumber: string; soc?: number; soh?: number },
) => {
  const swap = await getScopedSwap(id, staffId, role);
  let assignment = swap.vehicleId
    ? await prisma.vehicleBatteryAssignment.findFirst({
        where: { vehicleId: swap.vehicleId, active: true },
        include: { battery: true },
      })
    : null;

  let batteryIdToRemove: string | null = null;
  let currentSoc = input.soc ?? 50;
  let batterySnapshotSource: typeof assignment extends null
    ? never
    : NonNullable<typeof assignment>["battery"] | null = null;

  if (assignment) {
    const isMatch = batteryMatchesIdentifier(
      assignment.battery,
      input.serialNumber,
    );

    if (isMatch) {
      batteryIdToRemove = assignment.batteryId;
      currentSoc = input.soc ?? assignment.battery.soc;
      batterySnapshotSource = assignment.battery;
    }
  }

  if (!assignment || !batteryIdToRemove)
    throw new AppError(
      "Mã QR pin không trùng với Mã QR Pin đang lắp trên xe",
      409,
    );

  assertSwapTransition(swap.workflowStatus, SwapStatus.OLD_BATTERY_REMOVED);
  const targetBatteryId = batteryIdToRemove;

  return prisma.$transaction(async (tx) => {
    if (assignment) {
      await tx.vehicleBatteryAssignment.update({
        where: { id: assignment.id },
        data: { active: false, removedAt: new Date() },
      });
    }
    await tx.battery.update({
      where: { id: targetBatteryId },
      data: {
        operationalStatus: BatteryOperationalStatus.REMOVED,
        currentVehicleId: null,
        soc: currentSoc,
      },
    });
    await tx.swapTransaction.update({
      where: { id },
      data: {
        batteryInId: targetBatteryId,
        batteryInSoc: currentSoc,
        workflowStatus: SwapStatus.OLD_BATTERY_REMOVED,
        batteryInSnapshot: batterySnapshotSource
          ? {
              id: batterySnapshotSource.id,
              batteryCode: batterySnapshotSource.batteryCode,
              serialNumber: batterySnapshotSource.serialNumber,
              type: batterySnapshotSource.type,
              soh: input.soh !== undefined ? input.soh : batterySnapshotSource.soh,
              soc: currentSoc,
              cycleCount: batterySnapshotSource.cycleCount,
              temperature: batterySnapshotSource.temperature,
              voltage: batterySnapshotSource.voltage,
              safetyState: batterySnapshotSource.safetyState,
              operationalStatus: batterySnapshotSource.operationalStatus,
            }
          : undefined,
      },
    });
    await tx.swapStepHistory.create({
      data: {
        swapTransactionId: id,
        actorId: staffId,
        fromStatus: swap.workflowStatus,
        toStatus: SwapStatus.OLD_BATTERY_REMOVED,
        data: {
          action: "REMOVE_OLD_BATTERY",
          serialNumber: input.serialNumber,
          soc: currentSoc,
          ...(input.soh !== undefined ? { soh: input.soh } : {}),
        },
      },
    });
    return tx.swapTransaction.findUnique({ where: { id } });
  });
};

const inspect = async (
  id: string,
  staffId: string,
  role: string,
  input: {
    serialNumber: string;
    soc: number;
    soh: number;
    temperature?: number;
    voltage?: number;
    physicalCondition: string;
    outcome: "AVAILABLE" | "MAINTENANCE" | "QUARANTINED" | "RETIRED";
    notes?: string;
  },
) => {
  const swap = await getScopedSwap(id, staffId, role);
  const isMatch =
    swap.batteryIn &&
    batteryMatchesIdentifier(swap.batteryIn, input.serialNumber);
  if (!swap.batteryIn || !isMatch)
    throw new AppError(
      "Inspection battery does not match removed battery",
      409,
    );
  assertSwapTransition(swap.workflowStatus, SwapStatus.OLD_BATTERY_INSPECTED);
  const target = {
    AVAILABLE: BatteryOperationalStatus.AVAILABLE,
    MAINTENANCE: BatteryOperationalStatus.MAINTENANCE,
    QUARANTINED: BatteryOperationalStatus.QUARANTINED,
    RETIRED: BatteryOperationalStatus.RETIRED,
  }[input.outcome];
  const soh = round(input.soh);
  const accumulatedMileageKm = inferAccumulatedMileageKm(
    swap.batteryIn.accumulatedMileageKm,
    soh,
  );
  const updated = await prisma.$transaction(async (tx) => {
    await tx.battery.update({
      where: { id: swap.batteryInId! },
      data: {
        soc: input.soc,
        soh,
        estimatedSoH: soh,
        accumulatedMileageKm,
        healthClassification: classifyBatterySoh(soh),
        healthSource: BatteryHealthSource.MANUAL_INSPECTION,
        temperature: input.temperature,
        voltage: input.voltage,
        operationalStatus: target,
        lastHealthCheckAt: new Date(),
        lastEstimatedAt: new Date(),
        lastUpdated: new Date(),
      },
    });
    await tx.batteryInspection.create({
      data: {
        swapTransactionId: id,
        batteryId: swap.batteryInId!,
        inspectorId: staffId,
        ...input,
        soh,
      },
    });
    return move(
      tx,
      id,
      staffId,
      swap.workflowStatus,
      SwapStatus.OLD_BATTERY_INSPECTED,
      {
        outcome: input.outcome,
        soh,
        source: BatteryHealthSource.MANUAL_INSPECTION,
      },
    );
  });
  if (swap.booking?.user?.email) {
    await emailService.sendBatteryInspectionCompleted({
      customerName: swap.booking.user.fullName,
      customerEmail: swap.booking.user.email,
      serialNumber: input.serialNumber,
      soc: input.soc,
      soh,
      temperature: input.temperature,
      voltage: input.voltage,
      physicalCondition: input.physicalCondition,
      outcome: input.outcome,
      notes: input.notes,
    });
  }
  return updated;
};

const assignReplacement = async (
  id: string,
  staffId: string,
  role: string,
  serialNumber: string,
) => {
  const swap = await getScopedSwap(id, staffId, role);
  const reserved = swap.booking?.battery;
  const isMatch =
    reserved &&
    batteryMatchesIdentifier(reserved, serialNumber);
  if (
    !reserved ||
    !isMatch ||
    reserved.operationalStatus !== BatteryOperationalStatus.RESERVED ||
    reserved.safetyState !== "SAFE"
  )
    throw new AppError(
      "Scanned battery is not the safe battery reserved for this booking",
      409,
    );
  return prisma.$transaction(async (tx) => {
    await tx.swapTransaction.update({
      where: { id },
      data: {
        batteryOutId: reserved.id,
        batteryOutSoc: reserved.soc,
        batteryOutSnapshot: {
          id: reserved.id,
          batteryCode: reserved.batteryCode,
          serialNumber: reserved.serialNumber,
          type: reserved.type,
          soh: reserved.soh,
          soc: reserved.soc,
          cycleCount: reserved.cycleCount,
          temperature: reserved.temperature,
          voltage: reserved.voltage,
          safetyState: reserved.safetyState,
          operationalStatus: reserved.operationalStatus,
          slotId: reserved.slotId,
        },
      },
    });
    return move(
      tx,
      id,
      staffId,
      swap.workflowStatus,
      SwapStatus.REPLACEMENT_ASSIGNED,
      { serialNumber },
    );
  });
};

const install = async (
  id: string,
  staffId: string,
  role: string,
  serialNumber: string,
) => {
  const swap = await getScopedSwap(id, staffId, role);
  if (swap.workflowStatus === SwapStatus.INSTALLED) {
    return swap;
  }
  const isMatch =
    swap.batteryOut &&
    batteryMatchesIdentifier(swap.batteryOut, serialNumber);
  if (!swap.batteryOut || !isMatch)
    throw new AppError(
      "Installed battery does not match assigned replacement",
      409,
    );
  if (!swap.vehicleId || !swap.batteryOutId)
    throw new AppError("Swap is missing vehicle or replacement battery", 409);
  return prisma.$transaction(async (tx) => {
    await tx.vehicleBatteryAssignment.updateMany({
      where: { vehicleId: swap.vehicleId!, active: true },
      data: { active: false, removedAt: new Date() },
    });
    await tx.vehicleBatteryAssignment.create({
      data: {
        vehicleId: swap.vehicleId!,
        batteryId: swap.batteryOutId!,
        assignedById: staffId,
        active: true,
        assignedAt: new Date(),
      },
    });
    await tx.vehicle.update({
      where: { id: swap.vehicleId! },
      data: { currentBatteryId: swap.batteryOutId, status: "ACTIVE" },
    });
    await tx.battery.update({
      where: { id: swap.batteryOutId! },
      data: {
        operationalStatus: BatteryOperationalStatus.INSTALLED,
        currentVehicleId: swap.vehicleId,
        slotId: null,
        // stationId giữ nguyên để pin vẫn hiển thị trong kho trạm
      },
    });
    if (swap.bookingId) {
      await tx.batteryReservation.updateMany({
        where: { bookingId: swap.bookingId, status: ReservationStatus.ACTIVE },
        data: { status: ReservationStatus.CONSUMED },
      });
    }
    await tx.vehicleBatteryHistory.updateMany({
      where: { vehicleId: swap.vehicleId!, current: true },
      data: {
        current: false,
        removedAt: new Date(),
        removedStationId: swap.stationId,
        removedByStaffId: staffId,
        removalReason: "Battery swap",
      },
    });
    await tx.vehicleBatteryHistory.create({
      data: {
        vehicleId: swap.vehicleId!,
        batteryId: swap.batteryOutId!,
        installedAt: new Date(),
        installedStationId: swap.stationId,
        installedByStaffId: staffId,
        installationReason: "Battery swap",
        current: true,
      },
    });
    await tx.batteryLifecycleEvent.create({
      data: {
        batteryId: swap.batteryOutId!,
        actorId: staffId,
        eventType: "INSTALLED_TO_VEHICLE",
        fromStatus: BatteryOperationalStatus.RESERVED,
        toStatus: BatteryOperationalStatus.INSTALLED,
        safetyState: swap.batteryOut!.safetyState,
        snapshot: { swapTransactionId: swap.id, vehicleId: swap.vehicleId },
      },
    });
    return move(tx, id, staffId, swap.workflowStatus, SwapStatus.INSTALLED, {
      serialNumber,
    });
  });
};

const collectPayment = async (
  id: string,
  staffId: string,
  role: string,
  paymentMethod: "VNPAY" | "CASH" = "VNPAY"
) => {
  const swap = await getScopedSwap(id, staffId, role);
  if (
    !swap.booking ||
    !swap.vehicleId ||
    !swap.batteryOutId ||
    !swap.batteryOut
  )
    throw new AppError(
      "Swap is missing booking, vehicle or replacement battery",
      409,
    );
  const booking = swap.booking;
  const amount =
    booking.costEstimate && booking.costEstimate > 0
      ? booking.costEstimate
      : 45000;

  if (paymentMethod === "CASH") {
    if (swap.workflowStatus === SwapStatus.COMPLETED) {
      return getScopedSwap(id, staffId, role);
    }
    assertSwapTransition(swap.workflowStatus, SwapStatus.COMPLETED);
    await prisma.$transaction(async (tx) => {
      await tx.swapTransaction.update({
        where: { id },
        data: {
          workflowStatus: SwapStatus.COMPLETED,
          cost: amount,
          completedAt: new Date(),
        },
      });
      await tx.swapStepHistory.create({
        data: {
          swapTransactionId: id,
          actorId: staffId,
          fromStatus: swap.workflowStatus,
          toStatus: SwapStatus.COMPLETED,
          data: { paymentMethod: "CASH", amount },
        },
      });
      await tx.invoice.upsert({
        where: { transactionId: id },
        update: {
          amount,
          paymentMethod: PaymentMethod.CASH,
          status: InvoiceStatus.PAID,
        },
        create: {
          transactionId: id,
          amount,
          paymentMethod: PaymentMethod.CASH,
          status: InvoiceStatus.PAID,
        },
      });
      if (swap.vehicleId && swap.batteryOutId) {
        await tx.vehicleBatteryAssignment.updateMany({
          where: { vehicleId: swap.vehicleId, active: true },
          data: { active: false, removedAt: new Date() },
        });
        await tx.vehicleBatteryAssignment.create({
          data: {
            vehicleId: swap.vehicleId,
            batteryId: swap.batteryOutId,
            assignedById: staffId,
            active: true,
            assignedAt: new Date(),
          },
        });
        await tx.vehicle.update({
          where: { id: swap.vehicleId },
          data: { currentBatteryId: swap.batteryOutId, status: "ACTIVE" },
        });
        await tx.battery.update({
          where: { id: swap.batteryOutId },
          data: {
            operationalStatus: BatteryOperationalStatus.INSTALLED,
            currentVehicleId: swap.vehicleId,
            slotId: null,
            // stationId giữ nguyên để pin vẫn hiển thị trong kho trạm
          },
        });
      }
      if (swap.bookingId) {
        await tx.booking.update({
          where: { id: swap.bookingId },
          data: { status: BookingStatus.COMPLETED },
        });
        await tx.bayTimeSlot?.updateMany({
          where: { bookingId: swap.bookingId },
          data: { status: BayTimeSlotStatus.COMPLETED },
        });
        await tx.bayReservation.updateMany({
          where: { bookingId: swap.bookingId, status: ReservationStatus.ACTIVE },
          data: { status: ReservationStatus.CONSUMED },
        });
        await tx.slotReservation.updateMany({
          where: { bookingId: swap.bookingId, status: ReservationStatus.ACTIVE },
          data: { status: ReservationStatus.RELEASED },
        });
        await tx.batteryReservation.updateMany({
          where: { bookingId: swap.bookingId, status: ReservationStatus.ACTIVE },
          data: { status: ReservationStatus.CONSUMED },
        });
      }
      await tx.notification.create({
        data: {
          userId: swap.userId,
          type: NotificationType.PAYMENT_UPDATE,
          title: "Thanh toán tiền mặt thành công",
          message: `Xác nhận đã thu ${amount.toLocaleString("vi-VN")} VND tiền mặt tại trạm. Giao dịch đổi pin đã hoàn tất thành công!`,
          entityType: "Booking",
          entityId: swap.bookingId || id,
        },
      });
    });
    return getScopedSwap(id, staffId, role);
  }

  if (swap.workflowStatus !== SwapStatus.PAYMENT_PENDING) {
    assertSwapTransition(swap.workflowStatus, SwapStatus.PAYMENT_PENDING);
    await prisma.$transaction(async (tx) => {
      await tx.swapTransaction.update({
        where: { id },
        data: { workflowStatus: SwapStatus.PAYMENT_PENDING, cost: amount },
      });
      await tx.swapStepHistory.create({
        data: {
          swapTransactionId: id,
          actorId: staffId,
          fromStatus: swap.workflowStatus,
          toStatus: SwapStatus.PAYMENT_PENDING,
          data: { paymentMethod: "VNPAY", amount },
        },
      });
      await tx.invoice.upsert({
        where: { transactionId: id },
        update: {
          amount,
          paymentMethod: PaymentMethod.VNPAY,
          status: InvoiceStatus.UNPAID,
        },
        create: {
          transactionId: id,
          amount,
          paymentMethod: PaymentMethod.VNPAY,
          status: InvoiceStatus.UNPAID,
        },
      });
      if (swap.bookingId) {
        await tx.notification.create({
          data: {
            userId: swap.userId,
            type: NotificationType.PAYMENT_UPDATE,
            title: "Yêu cầu thanh toán",
            message: `Vui lòng thanh toán trực tiếp ${amount.toLocaleString("vi-VN")} VND qua VNPay để hoàn tất thay pin.`,
            entityType: "Booking",
            entityId: swap.bookingId,
          },
        });
      }
    });
  }

  const scopedSwap = await getScopedSwap(id, staffId, role);

  try {
    if (swap.bookingId && swap.userId) {
      const vnpayRes = await paymentService.initiateVNPayBookingPayment(
        swap.userId,
        swap.bookingId,
        "127.0.0.1"
      );
      return { ...scopedSwap, paymentUrl: vnpayRes.paymentUrl };
    }
  } catch {
    // If initiation error, fall back to email link
  }

  await emailService.sendPaymentRequested({
    customerName: swap.booking.user.fullName,
    customerEmail: swap.booking.user.email,
    amount,
    paymentUrl: `${env.CLIENT_URL.replace(/\/$/, "")}/app/payments/${booking.id}`,
  });

  return scopedSwap;
};

const rollback = async (
  id: string,
  staffId: string,
  role: string,
  reason: string,
) => {
  const swap = await getScopedSwap(id, staffId, role);
  if (
    swap.workflowStatus === SwapStatus.COMPLETED ||
    swap.workflowStatus === SwapStatus.ROLLED_BACK
  )
    throw new AppError(
      "Completed or rolled-back swap cannot be rolled back",
      409,
    );
  return prisma.$transaction(async (tx) => {
    assertSwapTransition(swap.workflowStatus, SwapStatus.FAILED);
    await tx.swapStepHistory.create({
      data: {
        swapTransactionId: id,
        actorId: staffId,
        fromStatus: swap.workflowStatus,
        toStatus: SwapStatus.FAILED,
        data: { reason },
      },
    });
    if (swap.vehicleId && swap.batteryOutId) {
      await tx.vehicleBatteryAssignment.updateMany({
        where: { vehicleId: swap.vehicleId, batteryId: swap.batteryOutId },
        data: { active: false, removedAt: new Date() },
      });
      await tx.vehicleBatteryHistory.updateMany({
        where: {
          vehicleId: swap.vehicleId,
          batteryId: swap.batteryOutId,
          current: true,
        },
        data: {
          current: false,
          removedAt: new Date(),
          removedStationId: swap.stationId,
          removedByStaffId: staffId,
          removalReason: "Swap rollback",
        },
      });
    }
    if (swap.vehicleId && swap.batteryInId) {
      await tx.vehicleBatteryAssignment.updateMany({
        where: { vehicleId: swap.vehicleId, batteryId: swap.batteryInId },
        data: { active: true, removedAt: null },
      });
      await tx.battery.update({
        where: { id: swap.batteryInId },
        data: {
          operationalStatus: BatteryOperationalStatus.INSTALLED,
          currentVehicleId: swap.vehicleId,
        },
      });
      await tx.vehicle.update({
        where: { id: swap.vehicleId },
        data: { currentBatteryId: swap.batteryInId },
      });
      await tx.vehicleBatteryHistory.updateMany({
        where: { vehicleId: swap.vehicleId, batteryId: swap.batteryInId },
        data: { current: true, removedAt: null, removalReason: null },
      });
    }
    const replacementBatteryId = swap.batteryOutId ?? swap.booking?.batteryId;
    if (replacementBatteryId)
      await tx.battery.update({
        where: { id: replacementBatteryId },
        data: {
          operationalStatus: BatteryOperationalStatus.AVAILABLE,
          currentVehicleId: null,
        },
      });
    if (swap.bookingId) {
      await tx.bayReservation.updateMany({
        where: { bookingId: swap.bookingId, status: ReservationStatus.ACTIVE },
        data: { status: ReservationStatus.RELEASED },
      });
      await tx.batteryReservation.updateMany({
        where: { bookingId: swap.bookingId, status: ReservationStatus.ACTIVE },
        data: { status: ReservationStatus.RELEASED },
      });
      await tx.booking.update({
        where: { id: swap.bookingId },
        data: { status: BookingStatus.CANCELLED },
      });
    }
    await tx.swapStepHistory.create({
      data: {
        swapTransactionId: id,
        actorId: staffId,
        fromStatus: SwapStatus.FAILED,
        toStatus: SwapStatus.ROLLED_BACK,
        data: { reason },
      },
    });
    return tx.swapTransaction.update({
      where: { id },
      data: {
        workflowStatus: SwapStatus.ROLLED_BACK,
        status: "FAILED",
        failureReason: reason,
      },
    });
  });
};

export const staffSwapService = {
  getContext,
  history,
  lookup,
  checkIn,
  getScopedSwap,
  verify,
  scanBattery,
  removeOldBattery,
  inspect,
  assignReplacement,
  install,
  collectPayment,
  rollback,
};
