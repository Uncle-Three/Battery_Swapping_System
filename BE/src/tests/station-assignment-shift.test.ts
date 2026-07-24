import { describe, expect, it } from "vitest";
import {
  getVietnamHour,
  isBookingWithinStationAssignmentShift,
  isStationAssignmentEffectiveNow,
  isWithinStationAssignmentShift,
} from "../common/utils/station-assignment-shift";

const vietnamTime = (isoHour: number, minute = 0) =>
  new Date(Date.UTC(2026, 6, 24, isoHour - 7, minute));

describe("station assignment shifts", () => {
  it("reads the hour in Vietnam time", () => {
    expect(getVietnamHour(vietnamTime(8))).toBe(8);
  });

  it("allows morning staff only from 08:00 until before 12:00", () => {
    expect(isWithinStationAssignmentShift("Sáng", vietnamTime(8))).toBe(true);
    expect(isWithinStationAssignmentShift("Ca sáng", vietnamTime(11, 59))).toBe(true);
    expect(isWithinStationAssignmentShift("Sáng", vietnamTime(12))).toBe(false);
    expect(isWithinStationAssignmentShift("Sáng", vietnamTime(7, 59))).toBe(false);
  });

  it("supports combined afternoon and evening shifts", () => {
    expect(isWithinStationAssignmentShift("Chiều, Tối", vietnamTime(17))).toBe(true);
    expect(isWithinStationAssignmentShift("Chiều, Tối", vietnamTime(21, 59))).toBe(true);
    expect(isWithinStationAssignmentShift("Chiều, Tối", vietnamTime(10))).toBe(false);
    expect(isWithinStationAssignmentShift("Chiều, Tối", vietnamTime(22))).toBe(false);
  });

  it("treats all configured shifts as 08:00 to 22:00", () => {
    expect(isWithinStationAssignmentShift("Tất cả các buổi", vietnamTime(8))).toBe(true);
    expect(isWithinStationAssignmentShift("Tất cả các buổi", vietnamTime(21, 59))).toBe(true);
    expect(isWithinStationAssignmentShift("Tất cả các buổi", vietnamTime(23))).toBe(false);
  });

  it("checks effective dates together with the current shift", () => {
    const now = vietnamTime(13);
    expect(isStationAssignmentEffectiveNow({
      effectiveFrom: new Date(now.getTime() - 60_000),
      effectiveTo: null,
      shift: "Chiều",
    }, now, true)).toBe(true);
    expect(isStationAssignmentEffectiveNow({
      effectiveFrom: new Date(now.getTime() - 60_000),
      effectiveTo: now,
      shift: "Chiều",
    }, now, true)).toBe(false);
  });

  it("shows only bookings fully contained in the assigned shift", () => {
    expect(isBookingWithinStationAssignmentShift(
      "Chiều",
      vietnamTime(17),
      vietnamTime(18),
    )).toBe(true);
    expect(isBookingWithinStationAssignmentShift(
      "Chiều",
      vietnamTime(18),
      vietnamTime(19),
    )).toBe(false);
    expect(isBookingWithinStationAssignmentShift(
      "Chiều",
      vietnamTime(17, 30),
      vietnamTime(18, 30),
    )).toBe(false);
  });

  it("allows a booking crossing two adjacent assigned shifts", () => {
    expect(isBookingWithinStationAssignmentShift(
      "Chiều, Tối",
      vietnamTime(17, 30),
      vietnamTime(18, 30),
    )).toBe(true);
  });
});
