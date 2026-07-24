import { describe, expect, it } from "vitest";
import { bayReservationOccupiesWindow } from "../modules/stations/station.service";

const date = (hour: number) => new Date(`2026-07-14T${String(hour).padStart(2, "0")}:00:00+07:00`);

describe("station booking bay schedule", () => {
  it("does not extend an approved reservation beyond its booked interval", () => {
    const reservation = { startsAt: date(8), endsAt: date(9), booking: { status: "APPROVED" } };
    expect(bayReservationOccupiesWindow(reservation, date(10), date(11))).toBe(false);
  });

  it("keeps a checked-in bay full until completion", () => {
    const reservation = { startsAt: date(8), endsAt: date(9), booking: { status: "CHECKED_IN" } };
    expect(bayReservationOccupiesWindow(reservation, date(12), date(13))).toBe(true);
  });

  it("does not extend an unapproved hold beyond its reserved interval", () => {
    const reservation = { startsAt: date(8), endsAt: date(9), booking: { status: "PENDING_APPROVAL" } };
    expect(bayReservationOccupiesWindow(reservation, date(10), date(11))).toBe(false);
  });

  it("does not block time before a future approved appointment", () => {
    const reservation = { startsAt: date(10), endsAt: date(11), booking: { status: "APPROVED" } };
    expect(bayReservationOccupiesWindow(reservation, date(8), date(9))).toBe(false);
  });

  it("does not let a stale checked-in reservation block another date", () => {
    const reservation = { startsAt: date(8), endsAt: date(9), booking: { status: "CHECKED_IN" } };
    const nextDayStart = new Date("2026-07-15T08:00:00+07:00");
    const nextDayEnd = new Date("2026-07-15T09:00:00+07:00");
    expect(bayReservationOccupiesWindow(reservation, nextDayStart, nextDayEnd)).toBe(false);
  });
});
