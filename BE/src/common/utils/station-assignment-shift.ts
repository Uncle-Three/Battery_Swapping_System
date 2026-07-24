const VIETNAM_TIME_ZONE = "Asia/Ho_Chi_Minh";
const shiftRanges = {
  morning: { start: 8 * 60, end: 12 * 60 },
  afternoon: { start: 12 * 60, end: 18 * 60 },
  evening: { start: 18 * 60, end: 22 * 60 },
};

const normalizeShift = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("vi-VN");

export const getVietnamHour = (date: Date) => {
  const hour = new Intl.DateTimeFormat("en-GB", {
    timeZone: VIETNAM_TIME_ZONE,
    hour: "2-digit",
    hourCycle: "h23",
  }).format(date);
  return Number(hour);
};

const getVietnamDateTimeParts = (date: Date) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: VIETNAM_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return {
    date: `${value("year")}-${value("month")}-${value("day")}`,
    minuteOfDay: Number(value("hour")) * 60 + Number(value("minute")),
  };
};

const assignedRanges = (shift: string) => {
  const normalized = normalizeShift(shift);
  const allShifts = normalized.includes("tat ca");
  const ranges = [
    ...(allShifts || normalized.includes("sang") ? [shiftRanges.morning] : []),
    ...(allShifts || normalized.includes("chieu") ? [shiftRanges.afternoon] : []),
    ...(allShifts || normalized.includes("toi") ? [shiftRanges.evening] : []),
  ];

  return ranges.reduce<Array<{ start: number; end: number }>>((merged, range) => {
    const previous = merged.at(-1);
    if (previous?.end === range.start) {
      previous.end = range.end;
    } else {
      merged.push({ ...range });
    }
    return merged;
  }, []);
};

export const isWithinStationAssignmentShift = (
  shift: string | null | undefined,
  date: Date,
) => {
  // Keep legacy assignments without a configured shift usable.
  if (!shift?.trim()) return true;

  const { minuteOfDay } = getVietnamDateTimeParts(date);
  return assignedRanges(shift).some(
    (range) => minuteOfDay >= range.start && minuteOfDay < range.end,
  );
};

export const isBookingWithinStationAssignmentShift = (
  shift: string | null | undefined,
  scheduledStart: Date | null | undefined,
  scheduledEnd: Date | null | undefined,
) => {
  if (!shift?.trim()) return true;
  if (!scheduledStart || !scheduledEnd || scheduledEnd <= scheduledStart) return false;

  const start = getVietnamDateTimeParts(scheduledStart);
  const end = getVietnamDateTimeParts(scheduledEnd);
  if (start.date !== end.date) return false;

  return assignedRanges(shift).some(
    (range) =>
      start.minuteOfDay >= range.start &&
      end.minuteOfDay <= range.end,
  );
};

export const isStationAssignmentEffectiveNow = (
  assignment: {
    effectiveFrom: Date;
    effectiveTo?: Date | null;
    shift?: string | null;
  },
  now: Date,
  requireCurrentShift = false,
) =>
  assignment.effectiveFrom <= now &&
  (!assignment.effectiveTo || assignment.effectiveTo > now) &&
  (!requireCurrentShift ||
    isWithinStationAssignmentShift(assignment.shift, now));
