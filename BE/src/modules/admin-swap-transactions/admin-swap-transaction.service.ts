import { type Prisma, SwapStatus } from "@prisma/client";
import { prisma } from "../../config/database";
import { AppError } from "../../common/errors/app-error";
import type { AdminSwapListQuery } from "./admin-swap-transaction.validation";

const statusMap: Record<string, SwapStatus | undefined> = {
  BOOKED: undefined,
  CHECKED_IN: "NOT_STARTED",
  OLD_BATTERY_REMOVED: "OLD_BATTERY_REMOVED",
  OLD_BATTERY_INSPECTED: "OLD_BATTERY_INSPECTED",
  NEW_BATTERY_ASSIGNED: "REPLACEMENT_ASSIGNED",
  NEW_BATTERY_INSTALLED: "INSTALLED",
  PAYMENT_PENDING: "PAYMENT_PENDING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  CANCELLED: "ROLLED_BACK",
};
const jsonRecord = (
  value: Prisma.JsonValue | null | undefined,
): Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const transactionCode = (id: string) => `SWP-${id.slice(-10).toUpperCase()}`;
const stepAt = (
  steps: Array<{ toStatus: SwapStatus; createdAt: Date }>,
  status: SwapStatus,
) => steps.find((step) => step.toStatus === status)?.createdAt ?? null;

export const listAdminSwaps = async (query: AdminSwapListQuery) => {
  const where: Prisma.SwapTransactionWhereInput = {};
  if (query.search)
    where.OR = [
      { id: query.search },
      {
        vehicle: {
          is: { plateNumber: { contains: query.search, mode: "insensitive" } },
        },
      },
      {
        vehicle: {
          is: { vinNumber: { contains: query.search, mode: "insensitive" } },
        },
      },
      {
        batteryIn: {
          is: { batteryCode: { contains: query.search, mode: "insensitive" } },
        },
      },
      {
        batteryOut: {
          is: { batteryCode: { contains: query.search, mode: "insensitive" } },
        },
      },
    ];
  if (query.plateNumber)
    where.vehicle = {
      is: { plateNumber: { contains: query.plateNumber, mode: "insensitive" } },
    };
  if (query.vin)
    where.vehicle = {
      is: { vinNumber: { contains: query.vin, mode: "insensitive" } },
    };
  if (query.oldBatteryCode)
    where.batteryIn = {
      is: {
        OR: [
          {
            batteryCode: {
              contains: query.oldBatteryCode,
              mode: "insensitive",
            },
          },
          {
            serialNumber: {
              contains: query.oldBatteryCode,
              mode: "insensitive",
            },
          },
        ],
      },
    };
  if (query.newBatteryCode)
    where.batteryOut = {
      is: {
        OR: [
          {
            batteryCode: {
              contains: query.newBatteryCode,
              mode: "insensitive",
            },
          },
          {
            serialNumber: {
              contains: query.newBatteryCode,
              mode: "insensitive",
            },
          },
        ],
      },
    };
  if (query.stationId) where.stationId = query.stationId;
  if (query.staffId) where.staffId = query.staffId;
  if (query.status && statusMap[query.status])
    where.workflowStatus = statusMap[query.status];
  if (query.paymentStatus) {
    const paymentFilter: Prisma.SwapTransactionWhereInput =
      query.paymentStatus === "SUCCESS"
        ? {
            OR: [
              { invoice: { is: { status: "PAID" } } },
              { payments: { some: { status: "SUCCESS" } } },
            ],
          }
        : query.paymentStatus === "UNPAID"
          ? { invoice: { is: { status: "UNPAID" } } }
          : {
              payments: {
                some: {
                  status: query.paymentStatus as
                    | "PENDING"
                    | "PROCESSING"
                    | "FAILED"
                    | "CANCELLED"
                    | "REFUNDED",
                },
              },
            };
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
      paymentFilter,
    ];
  }
  if (query.dateFrom || query.dateTo)
    where.createdAt = { gte: query.dateFrom, lte: query.dateTo };
  if (query.minOldSoh !== undefined || query.maxOldSoh !== undefined)
    where.inspection = {
      is: { soh: { gte: query.minOldSoh, lte: query.maxOldSoh } },
    };
  if (query.hasTechnicalError === true)
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
      {
        OR: [
          { failureReason: { not: null } },
          { inspection: { is: { outcome: { not: "AVAILABLE" } } } },
        ],
      },
    ];
  if (query.hasTechnicalError === false)
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
      { failureReason: null },
      {
        OR: [
          { inspection: null },
          { inspection: { is: { outcome: "AVAILABLE" } } },
        ],
      },
    ];
  if (query.hasRefund === true)
    where.payments = { some: { status: "REFUNDED" } };
  if (query.hasRefund === false)
    where.payments = { none: { status: "REFUNDED" } };
  const [items, total] = await Promise.all([
    prisma.swapTransaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      include: {
        vehicle: { select: { plateNumber: true, vinNumber: true } },
        station: { select: { name: true } },
        staff: { select: { fullName: true } },
        batteryIn: { select: { batteryCode: true, serialNumber: true } },
        batteryOut: { select: { batteryCode: true, serialNumber: true } },
        invoice: { select: { status: true } },
        payments: { select: { status: true } },
      },
    }),
    prisma.swapTransaction.count({ where }),
  ]);
  return {
    items: items.map((item) => ({
      id: item.id,
      code: transactionCode(item.id),
      createdAt: item.createdAt,
      completedAt: item.completedAt,
      status: item.workflowStatus,
      paymentStatus:
        item.payments.at(-1)?.status ?? item.invoice?.status ?? "UNPAID",
      vehicle: item.vehicle,
      station: item.station,
      staff: item.staff,
      oldBattery: item.batteryIn,
      newBattery: item.batteryOut,
      hasTechnicalError: Boolean(item.failureReason),
      hasRefund: item.payments.some((payment) => payment.status === "REFUNDED"),
    })),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
};

export const getAdminSwapDetail = async (id: string) => {
  const swap = await prisma.swapTransaction.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, fullName: true, email: true, phone: true } },
      vehicle: true,
      station: { select: { id: true, code: true, name: true, address: true } },
      staff: { select: { id: true, fullName: true } },
      booking: {
        include: {
          serviceBay: { select: { id: true, bayCode: true, bayName: true } },
          approvedBy: { select: { id: true, fullName: true } },
          approvalHistory: {
            orderBy: { createdAt: "desc" },
            take: 1,
            include: { manager: { select: { id: true, fullName: true } } },
          },
        },
      },
      batteryIn: {
        include: {
          batteryType: true,
          slot: { select: { id: true, slotNumber: true } },
        },
      },
      batteryOut: {
        include: {
          batteryType: true,
          slot: { select: { id: true, slotNumber: true } },
        },
      },
      inspection: {
        include: { inspector: { select: { id: true, fullName: true } } },
      },
      stepHistory: {
        orderBy: { createdAt: "asc" },
        include: { actor: { select: { id: true, fullName: true } } },
      },
      invoice: true,
      payments: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          amount: true,
          paymentMethod: true,
          status: true,
          description: true,
          vnpTxnRef: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });
  if (!swap) throw new AppError("Không tìm thấy giao dịch đổi pin", 404);
  const vehicleSnapshot = jsonRecord(swap.vehicleSnapshot);
  const ownerSnapshot = jsonRecord(swap.ownerSnapshot);
  const checkInStep = swap.stepHistory[0];
  const oldRemovedAt = stepAt(swap.stepHistory, "OLD_BATTERY_REMOVED");
  const installedAt = stepAt(swap.stepHistory, "INSTALLED");
  const durationSeconds = swap.completedAt
    ? Math.max(
        0,
        Math.round(
          (swap.completedAt.getTime() - swap.startedAt.getTime()) / 1000,
        ),
      )
    : null;
  const stepActor = (status: SwapStatus) =>
    swap.stepHistory.find((step) => step.toStatus === status)?.actor ?? null;
  const checklistSnapshot = jsonRecord(swap.technicalChecklist);
  return {
    transaction: {
      id: swap.id,
      code: transactionCode(swap.id),
      bookingId: swap.bookingId,
      checkInAt: checkInStep?.createdAt ?? swap.createdAt,
      startedAt: swap.startedAt,
      oldBatteryRemovedAt: oldRemovedAt,
      newBatteryInstalledAt: installedAt,
      completedAt: swap.completedAt,
      durationSeconds,
      status: swap.workflowStatus,
      resultStatus: swap.status,
      failureReason: swap.failureReason,
    },
    vehicle: {
      id: swap.vehicleId,
      plateNumber: vehicleSnapshot.plateNumber ?? swap.vehicle?.plateNumber,
      vinNumber: vehicleSnapshot.vinNumber ?? swap.vehicle?.vinNumber,
      model: vehicleSnapshot.model ?? swap.vehicle?.model,
      brand: vehicleSnapshot.brand ?? swap.vehicle?.brand,
      batteryType: vehicleSnapshot.batteryType ?? swap.vehicle?.batteryType,
      odo: vehicleSnapshot.odo ?? swap.vehicle?.currentMileageKm,
      owner: Object.keys(ownerSnapshot).length ? ownerSnapshot : swap.user,
      snapshotAvailable: Object.keys(vehicleSnapshot).length > 0,
    },
    oldBattery: swap.batteryIn
      ? {
          ...swap.batteryIn,
          snapshot: swap.batteryInSnapshot,
          inspection: swap.inspection,
        }
      : null,
    newBattery: swap.batteryOut
      ? { ...swap.batteryOut, snapshot: swap.batteryOutSnapshot, installedAt }
      : null,
    technicalChecks: [
      {
        key: "COMPATIBILITY",
        label: "Pin tương thích với xe",
        passed: checklistSnapshot.compatibility ?? null,
      },
      {
        key: "BMS",
        label: "Kết nối BMS thành công",
        passed: checklistSnapshot.bms ?? null,
      },
      {
        key: "TEMPERATURE",
        label: "Không có cảnh báo nhiệt độ",
        passed:
          swap.inspection?.temperature != null
            ? swap.inspection.temperature <= 50
            : null,
      },
      {
        key: "LOCK",
        label: "Khóa pin an toàn",
        passed: checklistSnapshot.lock ?? null,
      },
      {
        key: "ROAD_TEST",
        label: "Xe hoạt động bình thường sau khi lắp",
        passed: checklistSnapshot.roadTest ?? null,
      },
    ],
    inspection: swap.inspection,
    operation: {
      station: swap.station,
      serviceBay: swap.booking?.serviceBay ?? null,
      checkInStaff: checkInStep?.actor ?? swap.staff,
      removalStaff: stepActor("OLD_BATTERY_REMOVED"),
      inspectionStaff: stepActor("OLD_BATTERY_INSPECTED"),
      installationStaff: stepActor("INSTALLED"),
      completionStaff: stepActor("COMPLETED"),
      approvedBy:
        swap.booking?.approvedBy ??
        swap.booking?.approvalHistory[0]?.manager ??
        null,
    },
    payment: {
      invoice: swap.invoice
        ? {
            id: swap.invoice.id,
            amount: swap.invoice.amount,
            paymentMethod: swap.invoice.paymentMethod,
            status: swap.invoice.status,
            createdAt: swap.invoice.createdAt,
            updatedAt: swap.invoice.updatedAt,
          }
        : null,
      transactions: swap.payments,
      hasRefund: swap.payments.some((payment) => payment.status === "REFUNDED"),
    },
    steps: swap.stepHistory.map((step) => ({
      id: step.id,
      fromStatus: step.fromStatus,
      toStatus: step.toStatus,
      data: step.data,
      actor: step.actor,
      createdAt: step.createdAt,
    })),
  };
};
