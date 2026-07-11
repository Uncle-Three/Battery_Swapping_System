import { z } from "zod";

export const createBookingSchema = z.object({
  stationId: z.string().min(1),
  vehicleName: z.string().min(1),
  timeSlot: z.string().min(1),
});

