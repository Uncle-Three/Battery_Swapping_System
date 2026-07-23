export const SlotStatus = {
  EMPTY: "EMPTY",
  CHARGING: "CHARGING",
  READY: "READY",
  MAINTENANCE: "MAINTENANCE",
} as const;

export type SlotStatus = (typeof SlotStatus)[keyof typeof SlotStatus];

