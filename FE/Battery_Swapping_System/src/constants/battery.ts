export const BatteryStatus = {
  READY: 'READY',
  CHARGING: 'CHARGING',
  MAINTENANCE: 'MAINTENANCE',
  FAULTY: 'FAULTY',
} as const;

export type BatteryStatus = typeof BatteryStatus[keyof typeof BatteryStatus];

export const SlotStatus = {
  EMPTY: 'EMPTY',
  CHARGING: 'CHARGING',
  READY: 'READY',
  MAINTENANCE: 'MAINTENANCE',
} as const;

export type SlotStatus = typeof SlotStatus[keyof typeof SlotStatus];
