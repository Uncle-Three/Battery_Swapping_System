import { z } from 'zod';

const getTodayFormatted = () => {
  const d = new Date();
  return d.toISOString().split('T')[0];
};

export const addNewBatterySchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(1, 'Mã pin là bắt buộc.')
      .max(25, 'Mã pin không được vượt quá 25 ký tự.')
      .transform((v) => v.toUpperCase()),
    vehicleModelId: z
      .string()
      .trim()
      .min(1, 'Vui lòng chọn loại xe.'),
    batteryTypeId: z
      .string()
      .trim()
      .min(1, 'Vui lòng chọn loại pin.'),
    manufacturer: z
      .string()
      .default('VinES'),
    soc: z.coerce
      .number({ message: 'Mức pin phải là một số.' })
      .min(0, 'SOC phải nằm trong khoảng từ 0% đến 100%.')
      .max(100, 'SOC phải nằm trong khoảng từ 0% đến 100%.'),
    manufacturedAt: z
      .string()
      .min(1, 'Ngày sản xuất là bắt buộc.')
      .refine((dateStr) => {
        const d = new Date(dateStr);
        const today = new Date(getTodayFormatted() + 'T23:59:59');
        return d <= today;
      }, 'Ngày sản xuất không được ở tương lai.'),
    receivedAt: z
      .string()
      .min(1, 'Ngày nhập kho là bắt buộc.')
      .refine((dateStr) => {
        const d = new Date(dateStr);
        const today = new Date(getTodayFormatted() + 'T23:59:59');
        return d <= today;
      }, 'Ngày nhập kho không được ở tương lai.'),
    stationId: z
      .string()
      .trim()
      .min(1, 'Vui lòng chọn trạm lưu trữ.'),
    note: z
      .string()
      .trim()
      .max(500, 'Ghi chú không được vượt quá 500 ký tự.')
      .optional()
      .or(z.literal('')),
  })
  .refine(
    (data) => {
      if (!data.manufacturedAt || !data.receivedAt) return true;
      const m = new Date(data.manufacturedAt);
      const r = new Date(data.receivedAt);
      return r >= m;
    },
    {
      message: 'Ngày nhập kho không được trước ngày sản xuất.',
      path: ['receivedAt'],
    }
  );

export type AddNewBatteryFormData = z.infer<typeof addNewBatterySchema>;
