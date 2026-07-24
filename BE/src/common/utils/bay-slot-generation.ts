import { combineVietnamDateTime, formatVietnamDate } from "./vietnam-time";

export type GeneratedBaySlot = {
  bayId: string;
  date: string;
  startTime: string;
  endTime: string;
};

const minutesOf = (time: string) => {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
};

const timeOf = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

export const generateBaySlots = (input: {
  bayIds: string[];
  dateFrom: string;
  dateTo: string;
  daysOfWeek: number[];
  openingTime: string;
  closingTime: string;
  slotDurationMinutes: number;
  bufferMinutes: number;
}): GeneratedBaySlot[] => {
  const ranges: Array<{ startTime: string; endTime: string }> = [];
  const closing = minutesOf(input.closingTime);
  for (
    let start = minutesOf(input.openingTime);
    start + input.slotDurationMinutes <= closing;
    start += input.slotDurationMinutes + input.bufferMinutes
  ) {
    ranges.push({ startTime: timeOf(start), endTime: timeOf(start + input.slotDurationMinutes) });
  }

  const result: GeneratedBaySlot[] = [];
  for (
    let cursor = combineVietnamDateTime(input.dateFrom, "12:00");
    cursor <= combineVietnamDateTime(input.dateTo, "12:00");
    cursor = new Date(cursor.getTime() + 24 * 60 * 60_000)
  ) {
    const date = formatVietnamDate(cursor);
    // JS Sunday=0 ... Saturday=6, matching the existing frontend.
    const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
    if (!input.daysOfWeek.includes(weekday)) continue;
    for (const bayId of input.bayIds) {
      for (const range of ranges) result.push({ bayId, date, ...range });
    }
  }
  return result;
};

