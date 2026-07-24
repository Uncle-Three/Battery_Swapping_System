export const DEFAULT_BOOKING_HOLD_MINUTES = 30;

export const normalizeBookingHoldMinutes = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 1
    ? Math.floor(parsed)
    : DEFAULT_BOOKING_HOLD_MINUTES;
};

export const calculateBookingExpiry = (
  scheduledStart: Date,
  holdMinutes: number,
): Date =>
  new Date(
    scheduledStart.getTime() + normalizeBookingHoldMinutes(holdMinutes) * 60_000,
  );

export const remainingBookingHoldMinutes = (expiryTime: Date, now = new Date()): number =>
  Math.max(0, Math.ceil((expiryTime.getTime() - now.getTime()) / 60_000));
