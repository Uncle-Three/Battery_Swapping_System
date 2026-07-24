import { z } from "zod";
import { BatteryStatus } from "../../constants/battery-status";
import { objectIdSchema } from "../../common/validation/object-id";

export const updateBatteryStatusSchema = z.object({
  status: z.enum([
    BatteryStatus.READY,
    BatteryStatus.CHARGING,
    BatteryStatus.MAINTENANCE,
    BatteryStatus.FAULTY,
  ]),
});

const todayEnd = () => {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
};

export const createBatterySchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(1, "Mã pin không được để trống.")
      .max(25, "Mã pin tối đa 25 ký tự.")
      .transform((val) => val.toUpperCase()),
    serialNumber: z
      .string()
      .trim()
      .transform((val) => val.toUpperCase())
      .optional(),
    batteryTypeId: z.string().trim().min(1, "Loại pin không được để trống."),
    vehicleModelId: z.string().optional(),
    manufacturer: z
      .string()
      .trim()
      .default("VinES")
      .transform((val) => val || "VinES"),
    ratedCapacityAh: z.coerce
      .number()
      .gt(0, "Dung lượng định mức phải lớn hơn 0.")
      .optional()
      .default(100),
    ratedVoltage: z.coerce
      .number()
      .gt(0, "Điện áp định mức phải lớn hơn 0.")
      .optional()
      .default(400),
    soc: z.coerce
      .number()
      .min(0, "SOC phải nằm trong khoảng từ 0 đến 100.")
      .max(100, "SOC phải nằm trong khoảng từ 0 đến 100."),
    manufacturedAt: z.coerce
      .date()
      .refine((d) => d <= todayEnd(), "Ngày sản xuất không được ở tương lai."),
    receivedAt: z.coerce
      .date()
      .refine((d) => d <= todayEnd(), "Ngày nhập kho không được ở tương lai."),
    stationId: z.string().trim().min(1, "Trạm lưu trữ không được để trống."),
    storageLocation: z
      .string()
      .trim()
      .default("Kho trạm")
      .transform((val) => val || "Kho trạm"),
    note: z
      .string()
      .trim()
      .max(500, "Ghi chú tối đa 500 ký tự.")
      .optional()
      .nullable()
      .transform((val) => val || undefined),
  })
  .refine((data) => data.receivedAt >= new Date(new Date(data.manufacturedAt).setHours(0, 0, 0, 0)), {
    message: "Ngày nhập kho không được nhỏ hơn ngày sản xuất.",
    path: ["receivedAt"],
  });

export type CreateBatteryInput = z.infer<typeof createBatterySchema>;
