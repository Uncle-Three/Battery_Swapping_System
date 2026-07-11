export const BatteryStatus = {
  READY: "READY",
  CHARGING: "CHARGING",
  MAINTENANCE: "MAINTENANCE",
  FAULTY: "FAULTY",
} as const;

export type BatteryStatus = (typeof BatteryStatus)[keyof typeof BatteryStatus];

