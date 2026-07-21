import {
  BatteryOperationalStatus,
  BatterySafetyState,
  BookingStatus,
  PaymentStatus,
  ReplacementRequestStatus,
  SwapStatus,
} from "@prisma/client";
import { InvalidStateTransitionError } from "../errors/invalid-state-transition-error";

const batterySafetyTransitions = {
  UNKNOWN: [BatterySafetyState.SAFE, BatterySafetyState.WARNING, BatterySafetyState.UNSAFE],
  SAFE: [BatterySafetyState.WARNING, BatterySafetyState.UNSAFE],
  WARNING: [BatterySafetyState.SAFE, BatterySafetyState.UNSAFE],
  UNSAFE: [BatterySafetyState.SAFE, BatterySafetyState.WARNING],
} satisfies Record<BatterySafetyState, readonly BatterySafetyState[]>;

const batteryOperationalTransitions = {
  AVAILABLE: [BatteryOperationalStatus.RESERVED, BatteryOperationalStatus.MAINTENANCE, BatteryOperationalStatus.QUARANTINED, BatteryOperationalStatus.RETIRED],
  RESERVED: [BatteryOperationalStatus.AVAILABLE, BatteryOperationalStatus.INSTALLED, BatteryOperationalStatus.QUARANTINED],
  INSTALLED: [BatteryOperationalStatus.REMOVED],
  REMOVED: [BatteryOperationalStatus.INSPECTION_REQUIRED],
  INSPECTION_REQUIRED: [BatteryOperationalStatus.AVAILABLE, BatteryOperationalStatus.MAINTENANCE, BatteryOperationalStatus.QUARANTINED, BatteryOperationalStatus.RETIRED],
  MAINTENANCE: [BatteryOperationalStatus.AVAILABLE, BatteryOperationalStatus.QUARANTINED, BatteryOperationalStatus.RETIRED],
  QUARANTINED: [BatteryOperationalStatus.MAINTENANCE, BatteryOperationalStatus.RETIRED],
  RETIRED: [],
} satisfies Record<BatteryOperationalStatus, readonly BatteryOperationalStatus[]>;

const replacementRequestTransitions = {
  CREATED: [ReplacementRequestStatus.USER_NOTIFIED, ReplacementRequestStatus.CANCELLED],
  USER_NOTIFIED: [ReplacementRequestStatus.BOOKING_REQUIRED, ReplacementRequestStatus.CANCELLED],
  BOOKING_REQUIRED: [ReplacementRequestStatus.BOOKED, ReplacementRequestStatus.CANCELLED],
  BOOKED: [ReplacementRequestStatus.COMPLETED, ReplacementRequestStatus.CANCELLED],
  CANCELLED: [],
  COMPLETED: [],
} satisfies Record<ReplacementRequestStatus, readonly ReplacementRequestStatus[]>;

const swapTransitions = {
  NOT_STARTED: [SwapStatus.VERIFIED, SwapStatus.FAILED],
  VERIFIED: [SwapStatus.OLD_BATTERY_REMOVED, SwapStatus.FAILED],
  OLD_BATTERY_REMOVED: [SwapStatus.OLD_BATTERY_INSPECTED, SwapStatus.FAILED],
  OLD_BATTERY_INSPECTED: [SwapStatus.REPLACEMENT_ASSIGNED, SwapStatus.FAILED],
  REPLACEMENT_ASSIGNED: [SwapStatus.INSTALLED, SwapStatus.FAILED],
  INSTALLED: [SwapStatus.PAYMENT_PENDING, SwapStatus.FAILED],
  PAYMENT_PENDING: [SwapStatus.COMPLETED, SwapStatus.FAILED],
  COMPLETED: [],
  FAILED: [SwapStatus.ROLLED_BACK],
  ROLLED_BACK: [],
} satisfies Record<SwapStatus, readonly SwapStatus[]>;

const bookingTransitions = {
  CREATED: [BookingStatus.PENDING_APPROVAL, BookingStatus.CANCELLED, BookingStatus.EXPIRED],
  PENDING_APPROVAL: [BookingStatus.APPROVED, BookingStatus.REJECTED, BookingStatus.RESCHEDULE_PROPOSED, BookingStatus.CANCELLED, BookingStatus.EXPIRED],
  APPROVED: [BookingStatus.CHECKED_IN, BookingStatus.CANCELLED, BookingStatus.EXPIRED],
  REJECTED: [],
  RESCHEDULE_PROPOSED: [BookingStatus.RESCHEDULED, BookingStatus.REJECTED, BookingStatus.CANCELLED, BookingStatus.EXPIRED],
  RESCHEDULED: [BookingStatus.PENDING_APPROVAL, BookingStatus.CANCELLED, BookingStatus.EXPIRED],
  CHECKED_IN: [BookingStatus.COMPLETED, BookingStatus.CANCELLED],
  EXPIRED: [],
  CANCELLED: [],
  COMPLETED: [],
} satisfies Record<BookingStatus, readonly BookingStatus[]>;

const paymentTransitions = {
  PENDING: [PaymentStatus.PROCESSING, PaymentStatus.CANCELLED, PaymentStatus.FAILED],
  PROCESSING: [PaymentStatus.SUCCESS, PaymentStatus.FAILED, PaymentStatus.CANCELLED],
  SUCCESS: [PaymentStatus.REFUNDED],
  FAILED: [],
  CANCELLED: [],
  REFUNDED: [],
} satisfies Record<PaymentStatus, readonly PaymentStatus[]>;

export const assertTransition = <T extends string>(
  entity: string,
  transitions: Record<T, readonly T[]>,
  from: T,
  to: T,
): void => {
  if (!transitions[from].includes(to)) throw new InvalidStateTransitionError(entity, from, to);
};

export const stateMachines = {
  batterySafety: batterySafetyTransitions,
  batteryOperational: batteryOperationalTransitions,
  replacementRequest: replacementRequestTransitions,
  swap: swapTransitions,
  booking: bookingTransitions,
  payment: paymentTransitions,
} as const;

export const assertBatterySafetyTransition = (from: BatterySafetyState, to: BatterySafetyState) =>
  assertTransition("battery safety", batterySafetyTransitions, from, to);
export const assertBatteryOperationalTransition = (from: BatteryOperationalStatus, to: BatteryOperationalStatus) =>
  assertTransition("battery operational", batteryOperationalTransitions, from, to);
export const assertReplacementRequestTransition = (from: ReplacementRequestStatus, to: ReplacementRequestStatus) =>
  assertTransition("replacement request", replacementRequestTransitions, from, to);
export const assertSwapTransition = (from: SwapStatus, to: SwapStatus) =>
  assertTransition("swap", swapTransitions, from, to);
export const assertBookingTransition = (from: BookingStatus, to: BookingStatus) =>
  assertTransition("booking", bookingTransitions, from, to);
export const assertPaymentTransition = (from: PaymentStatus, to: PaymentStatus) =>
  assertTransition("payment", paymentTransitions, from, to);
