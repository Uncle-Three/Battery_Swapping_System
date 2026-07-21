import { z } from "zod";
import { SlotStatus } from "../../constants/slot-status";

export const updateSlotStatusSchema = z.object({
  status: z.enum([SlotStatus.EMPTY, SlotStatus.CHARGING, SlotStatus.READY, SlotStatus.MAINTENANCE]),
});

