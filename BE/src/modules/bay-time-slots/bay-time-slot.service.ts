import { BayTimeSlotStatus, Prisma, ServiceBayStatus, StationStatus } from "@prisma/client";
import { prisma } from "../../config/database";
import { BadRequestError } from "../../common/errors/bad-request-error";
import { ConflictError } from "../../common/errors/conflict-error";
import { NotFoundError } from "../../common/errors/not-found-error";
import { generateBaySlots } from "../../common/utils/bay-slot-generation";
import { validateSlotStatusTransition } from "../../common/utils/slot-status-transition";
import {
  combineVietnamDateTime,
  formatVietnamDate,
  formatVietnamTime,
  getVietnamEndOfDay,
  getVietnamStartOfDay,
} from "../../common/utils/vietnam-time";
import type { BulkCreateInput, SingleCreateInput, StatusInput } from "./bay-time-slot.validation";
const inactiveBayStatuses: ServiceBayStatus[] = [ServiceBayStatus.INACTIVE];
const unavailableBayStatuses: ServiceBayStatus[] = [ServiceBayStatus.INACTIVE, ServiceBayStatus.MAINTENANCE];
const weekdayCodes = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;
const unassignedSlotFilter = {
  OR: [
    { bookingId: null },
    { bookingId: { isSet: false } },
  ],
} satisfies Prisma.BayTimeSlotWhereInput;

const isWithinStationSchedule = (
  station: { openingTime: string | null; closingTime: string | null; workingDays: string[] },
  startAt: Date,
  endAt: Date,
) => {
  const date = formatVietnamDate(startAt);
  const weekday = weekdayCodes[new Date(`${date}T12:00:00Z`).getUTCDay()];
  if (station.workingDays.length && !station.workingDays.includes(weekday)) return false;
  const startTime = formatVietnamTime(startAt);
  const endTime = formatVietnamTime(endAt);
  return (!station.openingTime || startTime >= station.openingTime)
    && (!station.closingTime || endTime <= station.closingTime);
};

const audit = (input: {
  adminId: string;
  stationId: string;
  action: string;
  slotId?: string;
  before?: object;
  after?: object;
  details?: string;
}) => prisma.auditLog.create({
  data: {
    adminId: input.adminId,
    actorId: input.adminId,
    actorRole: "ADMIN",
    stationId: input.stationId,
    entityType: "BayTimeSlot",
    entityId: input.slotId,
    action: input.action,
    details: input.details,
    before: input.before,
    after: input.after,
  },
});

const ensureOperationalForAvailable = async (slot: {
  stationId: string;
  bayId: string;
  bookingId: string | null;
  startAt: Date;
}) => {
  if (slot.bookingId) throw new ConflictError("Khung giờ đang gắn với booking.");
  if (slot.startAt <= new Date()) throw new ConflictError("Khung giờ đã qua và không thể bật lại.");
  const [station, bay, maintenance] = await Promise.all([
    prisma.station.findUnique({ where: { id: slot.stationId }, select: { status: true } }),
    prisma.serviceBay.findUnique({ where: { id: slot.bayId }, select: { status: true } }),
    prisma.stationMaintenanceEvent.findFirst({
      where: {
        stationId: slot.stationId,
        status: { in: ["OPEN", "IN_PROGRESS"] },
        OR: [{ relatedEntityId: slot.bayId }, { relatedEntityId: null }],
      },
      select: { id: true },
    }),
  ]);
  if (station?.status !== StationStatus.ACTIVE) throw new ConflictError("Trạm hiện không hoạt động.");
  if (!bay || unavailableBayStatuses.includes(bay.status)) throw new ConflictError("Khoang đang bảo trì hoặc ngừng hoạt động.");
  if (maintenance) throw new ConflictError("Khung giờ xung đột với đợt bảo trì đang mở.");
};

const overlapExists = (bayId: string, startAt: Date, endAt: Date, excludeId?: string) =>
  prisma.bayTimeSlot.findFirst({
    where: {
      bayId,
      ...(excludeId ? { id: { not: excludeId } } : {}),
      status: { not: BayTimeSlotStatus.CANCELLED },
      startAt: { lt: endAt },
      endAt: { gt: startAt },
    },
    select: { id: true },
  });

const serialize = (slot: {
  id: string;
  startAt: Date;
  endAt: Date;
  status: BayTimeSlotStatus;
  bookingId: string | null;
  offReason: string | null;
  blockedReason: string | null;
  note: string | null;
}) => ({
  ...slot,
  displayStartTime: formatVietnamTime(slot.startAt),
  displayEndTime: formatVietnamTime(slot.endAt),
});

export const bayTimeSlotService = {
  createBulk: async (stationId: string, input: BulkCreateInput, adminId: string) => {
    const [station, bays] = await Promise.all([
      prisma.station.findUnique({ where: { id: stationId } }),
      prisma.serviceBay.findMany({ where: { id: { in: input.bayIds } } }),
    ]);
    if (!station) throw new NotFoundError("Không tìm thấy trạm.");
    const bayMap = new Map(bays.map((bay) => [bay.id, bay]));
    if (bays.some((bay) => bay.stationId !== stationId)) throw new BadRequestError("Có khoang không thuộc trạm đã chọn.");

    const requested = input.slots?.length
      ? input.slots
      : generateBaySlots(input).map((slot) => ({ ...slot, status: "AVAILABLE" as const, reason: undefined }));

    const minStartAt = getVietnamStartOfDay(input.dateFrom);
    const maxEndAt = getVietnamEndOfDay(input.dateTo);

    const existingSlots = await prisma.bayTimeSlot.findMany({
      where: {
        stationId,
        bayId: { in: input.bayIds },
        status: { not: BayTimeSlotStatus.CANCELLED },
        startAt: { lt: maxEndAt },
        endAt: { gt: minStartAt },
      },
      select: { bayId: true, startAt: true, endAt: true },
    });

    const skippedSlots: Array<{ bayId: string; date: string; startTime: string; endTime: string; reason: string }> = [];
    const validToCreate: Array<{
      stationId: string;
      bayId: string;
      startAt: Date;
      endAt: Date;
      status: BayTimeSlotStatus;
      offReason?: string;
      blockedReason?: string;
      note?: string;
      createdById: string;
      updatedById: string;
    }> = [];

    const now = new Date();
    let available = 0;
    let off = 0;

    for (const item of requested) {
      const fail = (reason: string) => skippedSlots.push({ bayId: item.bayId, date: item.date, startTime: item.startTime, endTime: item.endTime, reason });
      const bay = bayMap.get(item.bayId);
      if (!bay || !input.bayIds.includes(item.bayId)) { fail("Khoang không nằm trong danh sách đã chọn"); continue; }
      if (bay.stationId !== stationId) { fail("Khoang không thuộc trạm"); continue; }
      if (inactiveBayStatuses.includes(bay.status)) { fail("Khoang đã ngừng hoạt động"); continue; }
      if (bay.status === ServiceBayStatus.MAINTENANCE) { fail("Khoang đang bảo trì"); continue; }
      if (item.date < input.dateFrom || item.date > input.dateTo) { fail("Ngày nằm ngoài khoảng đã chọn"); continue; }

      const startAt = combineVietnamDateTime(item.date, item.startTime);
      const endAt = combineVietnamDateTime(item.date, item.endTime);
      if (startAt <= now || endAt <= startAt) { fail("Khung giờ đã qua hoặc không hợp lệ"); continue; }
      const weekday = new Date(`${item.date}T12:00:00Z`).getUTCDay();
      if (!input.daysOfWeek.includes(weekday)) { fail("Ngày không nằm trong các ngày hoạt động đã chọn"); continue; }
      if (item.startTime < input.openingTime || item.endTime > input.closingTime) {
        fail("Khung giờ nằm ngoài giờ hoạt động đã chọn");
        continue;
      }

      const isOverlappingDb = existingSlots.some(
        (existing) => existing.bayId === item.bayId && existing.startAt < endAt && existing.endAt > startAt,
      );
      if (isOverlappingDb) { fail("Khung giờ bị trùng hoặc chồng lấn với lịch đã tồn tại"); continue; }

      const isOverlappingBatch = validToCreate.some(
        (created) => created.bayId === item.bayId && created.startAt < endAt && created.endAt > startAt,
      );
      if (isOverlappingBatch) { fail("Khung giờ bị trùng trong cùng đợt tạo"); continue; }

      const status = item.status as BayTimeSlotStatus;
      validToCreate.push({
        stationId,
        bayId: item.bayId,
        startAt,
        endAt,
        status,
        offReason: status === BayTimeSlotStatus.OFF ? item.reason : undefined,
        blockedReason: status === BayTimeSlotStatus.BLOCKED ? item.reason : undefined,
        note: input.note ?? undefined,
        createdById: adminId,
        updatedById: adminId,
      });

      if (status === BayTimeSlotStatus.OFF) off += 1;
      if (status === BayTimeSlotStatus.AVAILABLE) available += 1;
    }

    if (validToCreate.length > 0) {
      await prisma.bayTimeSlot.createMany({
        data: validToCreate,
      });
    }
    await prisma.station.update({
      where: { id: stationId },
      data: {
        openingTime: input.openingTime,
        closingTime: input.closingTime,
        workingDays: input.daysOfWeek.map((day) => weekdayCodes[day]),
      },
    });

    await audit({
      adminId,
      stationId,
      action: "BAY_SLOTS_BULK_CREATED",
      details: JSON.stringify({ requested: requested.length, created: validToCreate.length, skipped: skippedSlots.length }),
    });

    return {
      summary: { requested: requested.length, created: validToCreate.length, available, off, skipped: skippedSlots.length },
      skippedSlots,
    };
  },

  list: async (stationId: string, query: {
    date: string;
    bayId?: string;
    status?: BayTimeSlotStatus;
    search?: string;
    page: number;
    limit: number;
  }) => {
    const station = await prisma.station.findUnique({ where: { id: stationId }, select: { id: true } });
    if (!station) throw new NotFoundError("Không tìm thấy trạm.");
    const bayWhere = {
      stationId,
      ...(query.bayId ? { id: query.bayId } : {}),
      ...(query.search ? { OR: [{ bayCode: { contains: query.search, mode: "insensitive" as const } }, { bayName: { contains: query.search, mode: "insensitive" as const } }] } : {}),
    };
    const bays = await prisma.serviceBay.findMany({
      where: bayWhere,
      orderBy: { bayCode: "asc" },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });
    const slots = await prisma.bayTimeSlot.findMany({
      where: {
        stationId,
        bayId: { in: bays.map((bay) => bay.id) },
        startAt: { gte: getVietnamStartOfDay(query.date), lt: getVietnamEndOfDay(query.date) },
        ...(query.status ? { status: query.status } : {}),
      },
      orderBy: [{ bayId: "asc" }, { startAt: "asc" }],
    });
    return {
      date: query.date,
      bays: bays.map((bay) => ({
        bayId: bay.id,
        bayCode: bay.bayCode,
        bayName: bay.bayName,
        bayStatus: bay.status,
        slots: slots.filter((slot) => slot.bayId === bay.id).map(serialize),
      })),
      pagination: {
        page: query.page,
        limit: query.limit,
        total: await prisma.serviceBay.count({ where: bayWhere }),
      },
    };
  },

  createSingle: async (bayId: string, input: SingleCreateInput, adminId: string) => {
    const bay = await prisma.serviceBay.findUnique({ where: { id: bayId }, include: { station: true } });
    if (!bay) throw new NotFoundError("Không tìm thấy khoang.");
    if (inactiveBayStatuses.includes(bay.status)) throw new ConflictError("Khoang đã ngừng hoạt động.");
    const startAt = combineVietnamDateTime(input.date, input.startTime);
    const endAt = combineVietnamDateTime(input.date, input.endTime);
    if (startAt <= new Date()) throw new BadRequestError("Không thể tạo khung giờ trong quá khứ.");
    if (await overlapExists(bayId, startAt, endAt)) throw new ConflictError("Khung giờ bị trùng hoặc chồng lấn.");
    const status = input.status as BayTimeSlotStatus;
    const slot = await prisma.bayTimeSlot.create({
      data: {
        stationId: bay.stationId,
        bayId,
        startAt,
        endAt,
        status,
        offReason: status === BayTimeSlotStatus.OFF ? input.reason : undefined,
        blockedReason: status === BayTimeSlotStatus.BLOCKED ? input.reason : undefined,
        note: input.note,
        createdById: adminId,
        updatedById: adminId,
      },
    });
    await audit({ adminId, stationId: bay.stationId, slotId: slot.id, action: "BAY_SLOT_CREATED", after: slot });
    return serialize(slot);
  },

  updateStatus: async (slotId: string, input: StatusInput, adminId: string) => {
    const before = await prisma.bayTimeSlot.findUnique({ where: { id: slotId } });
    if (!before) throw new NotFoundError("Không tìm thấy khung giờ.");
    const next = input.status as BayTimeSlotStatus;
    validateSlotStatusTransition(before.status, next);
    if (next === BayTimeSlotStatus.AVAILABLE) await ensureOperationalForAvailable(before);
    if (next === BayTimeSlotStatus.OFF && before.bookingId) throw new ConflictError("Khung giờ đã có người đặt.");
    const slot = await prisma.bayTimeSlot.update({
      where: { id: slotId },
      data: {
        status: next,
        offReason: next === BayTimeSlotStatus.OFF ? input.reason : null,
        blockedReason: next === BayTimeSlotStatus.BLOCKED ? input.reason : null,
        updatedById: adminId,
      },
    });
    const action =
      next === BayTimeSlotStatus.OFF ? "BAY_SLOT_TURNED_OFF"
      : before.status === BayTimeSlotStatus.OFF ? "BAY_SLOT_TURNED_ON"
      : next === BayTimeSlotStatus.BLOCKED ? "BAY_SLOT_BLOCKED"
      : "BAY_SLOT_UNBLOCKED";
    await audit({ adminId, stationId: slot.stationId, slotId, action, before, after: slot });
    return serialize(slot);
  },

  updateBulkStatus: async (slotIds: string[], input: StatusInput, adminId: string) => {
    let updated = 0;
    const errors: Array<{ slotId: string; reason: string }> = [];
    for (const slotId of slotIds) {
      try {
        await bayTimeSlotService.updateStatus(slotId, input, adminId);
        updated += 1;
      } catch (error) {
        errors.push({ slotId, reason: error instanceof Error ? error.message : "Không thể cập nhật khung giờ" });
      }
    }
    return { summary: { requested: slotIds.length, updated, skipped: errors.length }, errors };
  },

  remove: async (slotId: string, adminId: string) => {
    const slot = await prisma.bayTimeSlot.findUnique({ where: { id: slotId } });
    if (!slot) throw new NotFoundError("Không tìm thấy khung giờ.");
    if (slot.bookingId || slot.startAt <= new Date() || !["AVAILABLE", "OFF", "CANCELLED"].includes(slot.status)) {
      throw new ConflictError("Chỉ có thể xóa khung giờ trống, chưa bắt đầu và không có lịch sử sử dụng.");
    }
    await prisma.bayTimeSlot.delete({ where: { id: slotId } });
    await audit({ adminId, stationId: slot.stationId, slotId, action: "BAY_SLOT_DELETED", before: slot });
    return { id: slotId };
  },

  available: async (stationId: string, date: string) => {
    const station = await prisma.station.findFirst({ where: { id: stationId, status: StationStatus.ACTIVE }, select: { id: true } });
    if (!station) return [];
    return (await prisma.bayTimeSlot.findMany({
      where: {
        stationId,
        status: BayTimeSlotStatus.AVAILABLE,
        ...unassignedSlotFilter,
        startAt: { gt: new Date(), gte: getVietnamStartOfDay(date), lt: getVietnamEndOfDay(date) },
        bay: { status: { notIn: unavailableBayStatuses } },
      },
      include: { bay: { select: { bayCode: true, bayName: true } } },
      orderBy: [{ startAt: "asc" }, { bayId: "asc" }],
    })).map((slot) => ({
      id: slot.id,
      stationId: slot.stationId,
      bayId: slot.bayId,
      bayCode: slot.bay.bayCode,
      bayName: slot.bay.bayName,
      date: formatVietnamDate(slot.startAt),
      startAt: slot.startAt,
      endAt: slot.endAt,
      displayStartTime: formatVietnamTime(slot.startAt),
      displayEndTime: formatVietnamTime(slot.endAt),
      status: slot.status,
    }));
  },

  groupedAvailability: async (stationId: string, date: string) => {
    const station = await prisma.station.findFirst({
      where: { id: stationId, status: StationStatus.ACTIVE },
      select: { id: true, openingTime: true, closingTime: true, workingDays: true },
    });
    if (!station) return [];

    const slots = await prisma.bayTimeSlot.findMany({
      where: {
        stationId,
        startAt: { gte: getVietnamStartOfDay(date), lt: getVietnamEndOfDay(date) },
        status: { not: BayTimeSlotStatus.CANCELLED },
      },
      include: { bay: { select: { status: true } } },
      orderBy: [{ startAt: "asc" }, { endAt: "asc" }],
    });

    const validSlots = slots.filter((slot) => isWithinStationSchedule(station, slot.startAt, slot.endAt));
    const groups = new Map<string, typeof validSlots>();
    for (const slot of validSlots) {
      const key = `${slot.startAt.toISOString()}:${slot.endAt.toISOString()}`;
      const group = groups.get(key) ?? [];
      group.push(slot);
      groups.set(key, group);
    }

    const now = new Date();
    return Array.from(groups.values()).map((group) => {
      const first = group[0];
      const operational = group.filter((slot) => !unavailableBayStatuses.includes(slot.bay.status));
      const availableBays = operational.filter((slot) =>
        slot.status === BayTimeSlotStatus.AVAILABLE
        && slot.bookingId === null
        && slot.startAt > now).length;
      const totalBays = new Set(group.map((slot) => slot.bayId)).size;
      const status =
        first.endAt <= now ? "PAST"
        : availableBays > 1 ? "AVAILABLE"
        : availableBays === 1 ? "LOW_AVAILABILITY"
        : "FULL";
      return {
        startAt: first.startAt,
        endAt: first.endAt,
        displayStartTime: formatVietnamTime(first.startAt),
        displayEndTime: formatVietnamTime(first.endAt),
        durationMinutes: (first.endAt.getTime() - first.startAt.getTime()) / 60_000,
        totalBays,
        availableBays,
        status,
      };
    });
  },

  availableDates: async (stationId: string) => {
    const station = await prisma.station.findFirst({
      where: { id: stationId, status: StationStatus.ACTIVE },
      select: { id: true, openingTime: true, closingTime: true, workingDays: true },
    });
    if (!station) return {
      dates: [],
      dateFrom: null,
      dateTo: null,
      openingTime: null,
      closingTime: null,
      workingDays: [],
    };
    const operationalBayIds = (await prisma.serviceBay.findMany({
      where: { stationId, status: { notIn: unavailableBayStatuses } },
      select: { id: true },
    })).map((bay) => bay.id);
    const slots = operationalBayIds.length
      ? await prisma.bayTimeSlot.findMany({
        where: {
          stationId,
          bayId: { in: operationalBayIds },
          status: BayTimeSlotStatus.AVAILABLE,
          startAt: { gt: new Date() },
          ...unassignedSlotFilter,
        },
        select: { startAt: true, endAt: true },
        orderBy: { startAt: "asc" },
      })
      : [];
    const dates = [...new Set(
      slots
        .filter((slot) => isWithinStationSchedule(station, slot.startAt, slot.endAt))
        .map((slot) => formatVietnamDate(slot.startAt)),
    )];
    return {
      dates,
      dateFrom: dates[0] ?? null,
      dateTo: dates.at(-1) ?? null,
      openingTime: station.openingTime,
      closingTime: station.closingTime,
      workingDays: station.workingDays,
    };
  },

  expirePast: async (now = new Date()) => {
    const expired = await prisma.bayTimeSlot.updateMany({
      where: {
        endAt: { lt: now },
        status: { in: [BayTimeSlotStatus.AVAILABLE, BayTimeSlotStatus.OFF] },
      },
      data: { status: BayTimeSlotStatus.EXPIRED },
    });
    const reserved = await prisma.bayTimeSlot.updateMany({
      where: {
        endAt: { lt: now },
        status: BayTimeSlotStatus.RESERVED,
        booking: { status: { not: "CHECKED_IN" } },
      },
      data: { status: BayTimeSlotStatus.EXPIRED },
    });
    return expired.count + reserved.count;
  },
};
