import { z } from "zod";
import { objectIdSchema } from "../../common/validation/object-id";

const booleanQuery = z.union([
  z.boolean(),
  z.enum(["true", "false"]).transform((value) => value === "true"),
]);

export const adminSwapParamsSchema = z.object({
  transactionId: objectIdSchema,
});
export const adminSwapListQuerySchema = z
  .object({
    search: z.string().trim().max(100).optional(),
    plateNumber: z.string().trim().max(30).optional(),
    vin: z.string().trim().max(50).optional(),
    oldBatteryCode: z.string().trim().max(100).optional(),
    newBatteryCode: z.string().trim().max(100).optional(),
    stationId: objectIdSchema.optional(),
    staffId: objectIdSchema.optional(),
    vehicleModel: z.string().trim().max(100).optional(),
    oldBatterySafety: z
      .enum(["SAFE", "WARNING", "UNSAFE", "NO_DATA"])
      .optional(),
    newBatterySafety: z
      .enum(["SAFE", "WARNING", "UNSAFE", "NO_DATA"])
      .optional(),
    status: z
      .enum([
        "BOOKED",
        "CHECKED_IN",
        "OLD_BATTERY_REMOVED",
        "OLD_BATTERY_INSPECTED",
        "NEW_BATTERY_ASSIGNED",
        "NEW_BATTERY_INSTALLED",
        "PAYMENT_PENDING",
        "COMPLETED",
        "FAILED",
        "CANCELLED",
      ])
      .optional(),
    paymentStatus: z
      .enum([
        "UNPAID",
        "PAID",
        "PENDING",
        "PROCESSING",
        "SUCCESS",
        "FAILED",
        "CANCELLED",
        "REFUNDED",
      ])
      .optional(),
    paymentMethod: z
      .enum(["MOMO", "VNPAY", "CARD", "WALLET", "CASH"])
      .optional(),
    dateFrom: z.coerce.date().optional(),
    dateTo: z.coerce.date().optional(),
    minOdo: z.coerce.number().nonnegative().optional(),
    maxOdo: z.coerce.number().nonnegative().optional(),
    minOldSoh: z.coerce.number().min(0).max(100).optional(),
    maxOldSoh: z.coerce.number().min(0).max(100).optional(),
    minNewSoh: z.coerce.number().min(0).max(100).optional(),
    maxNewSoh: z.coerce.number().min(0).max(100).optional(),
    hasTechnicalError: booleanQuery.optional(),
    hasRefund: booleanQuery.optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce
      .number()
      .int()
      .refine((value) => [10, 20, 50, 100].includes(value))
      .default(20),
    sortBy: z
      .enum([
        "createdAt",
        "completedAt",
        "transactionCode",
        "odo",
        "oldSoh",
        "newSoh",
        "amount",
        "status",
      ])
      .default("completedAt"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
  })
  .refine(
    (value) =>
      value.minOldSoh === undefined ||
      value.maxOldSoh === undefined ||
      value.minOldSoh <= value.maxOldSoh,
    { message: "SoH pin cũ tối thiểu không được lớn hơn tối đa" },
  )
  .refine(
    (value) =>
      value.minNewSoh === undefined ||
      value.maxNewSoh === undefined ||
      value.minNewSoh <= value.maxNewSoh,
    { message: "SoH pin mới tối thiểu không được lớn hơn tối đa" },
  )
  .refine(
    (value) =>
      value.minOdo === undefined ||
      value.maxOdo === undefined ||
      value.minOdo <= value.maxOdo,
    { message: "ODO tối thiểu không được lớn hơn tối đa" },
  )
  .refine(
    (value) =>
      value.dateFrom === undefined ||
      value.dateTo === undefined ||
      value.dateFrom <= value.dateTo,
    { message: "Khoảng ngày không hợp lệ" },
  );

export type AdminSwapListQuery = z.infer<typeof adminSwapListQuerySchema>;
