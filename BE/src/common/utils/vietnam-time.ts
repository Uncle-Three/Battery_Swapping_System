const VIETNAM_OFFSET_MS = 7 * 60 * 60_000;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export const isDateOnly = (value: string) => {
  if (!DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};

export const isTimeOnly = (value: string) => TIME_PATTERN.test(value);

export const combineVietnamDateTime = (date: string, time: string): Date => {
  if (!isDateOnly(date) || !isTimeOnly(time)) throw new Error("Invalid Vietnam local date or time");
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  return new Date(Date.UTC(year, month - 1, day, hour, minute) - VIETNAM_OFFSET_MS);
};

export const formatVietnamDate = (date: Date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

export const formatVietnamTime = (date: Date) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);

export const getVietnamStartOfDay = (date: string) => combineVietnamDateTime(date, "00:00");
export const getVietnamEndOfDay = (date: string) =>
  new Date(getVietnamStartOfDay(date).getTime() + 24 * 60 * 60_000);

export const vietnamToday = (now = new Date()) => formatVietnamDate(now);

