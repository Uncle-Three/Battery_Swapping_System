import { z } from "zod";

export const initiateSwapSchema = z.object({
  bookingId: z.string().min(1),
});

export const processSwapSchema = z
  .object({
    rfidCard: z.string().optional(),
    licensePlate: z.string().optional(),
  })
  .refine((value) => value.rfidCard || value.licensePlate, {
    message: "rfidCard or licensePlate is required",
  });

