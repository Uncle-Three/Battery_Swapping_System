import { z } from "zod";
import { objectIdSchema } from "../../common/validation/object-id";

export const reserveReplacementSchema = z.object({
  batteryId: z.string().trim().min(1, "Battery ID không được để trống"),
});

export const verifyQrSchema = z.object({
  scannedValue: z.string().trim().min(1, "Mã quét QR không được để trống"),
});

export const reportShortageSchema = z.object({
  reason: z.string().trim().optional(),
});

export const replacementSwapParamsSchema = z.object({
  swapId: z.string().trim().min(1, "Swap ID không được để trống"),
});
