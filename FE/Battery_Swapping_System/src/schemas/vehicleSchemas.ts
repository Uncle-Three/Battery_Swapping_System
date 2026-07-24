import { z } from "zod";

export const addVehicleSchema = z.object({
  plateNumber: z.string().min(1, "Biển số xe là bắt buộc").regex(/^[0-9]{2}[a-zA-Z]{1,2}[0-9]?[-. ]?[0-9]{4,5}$/, "Biển số xe không hợp lệ (vd: 51A-123.45)").toUpperCase(),
  vin: z.string().optional(),
  brand: z.string().default("VinFast"),
  model: z.string().min(1, "Dòng xe là bắt buộc"),
  manufactureYear: z.number().int().max(new Date().getFullYear(), "Năm sản xuất không hợp lệ"),
  purchaseDate: z.string().refine((val) => {
    const date = new Date(val);
    return date <= new Date();
  }, "Ngày mua không được trong tương lai"),
  currentMileageKm: z.number().min(0, "Số km không hợp lệ").max(999999, "Số km không được vượt quá 999,999"),
  qrCodeValue: z.string().min(1, "Vui lòng tải lên hoặc nhập mã QR pin"),
  batteryType: z.string().min(1, "Loại pin là bắt buộc"),
  batteryOwnershipType: z.enum(["OWNED", "SUBSCRIPTION", "LEASED", "UNKNOWN"]).default("UNKNOWN"),
  color: z.string().optional(),
  preferredStationId: z.string().optional(),
  note: z.string().optional(),
});

export type AddVehicleFormValues = z.infer<typeof addVehicleSchema>;
export type AddVehicleFormInput = z.input<typeof addVehicleSchema>;

export const editVehicleSchema = z.object({
  brand: z.string().optional(),
  model: z.string().optional(),
  vin: z.string().optional(),
  color: z.string().optional(),
  purchaseDate: z.string().refine((val) => {
    if (!val) return true;
    const date = new Date(val);
    return date <= new Date();
  }, "Cannot be in the future").optional(),
  currentMileageKm: z.number().min(0, "Số km không hợp lệ").max(999999, "Số km không được vượt quá 999,999").optional(),
  preferredStationId: z.string().optional(),
  note: z.string().optional(),
});

export type EditVehicleFormValues = z.infer<typeof editVehicleSchema>;

export const updateMileageSchema = z.object({
  currentMileageKm: z.number().min(0, "Số km không hợp lệ").max(999999, "Số km không được vượt quá 999,999"),
  recordedAt: z.string().optional(),
  note: z.string().optional(),
});

export type UpdateMileageFormValues = z.infer<typeof updateMileageSchema>;
