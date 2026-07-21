import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateMileageSchema, type UpdateMileageFormValues } from "../../schemas/vehicleSchemas";
import { vehicleService } from "../../services/vehicleService";
import { X, Loader2 } from "lucide-react";
import type { Vehicle } from "../../types/vehicle";

interface UpdateMileageDialogProps {
  vehicle: Vehicle;
  onClose: () => void;
  onSuccess: () => void;
}

export function UpdateMileageDialog({ vehicle, onClose, onSuccess }: UpdateMileageDialogProps) {
  const [error, setError] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting }, watch } = useForm<UpdateMileageFormValues>({
    resolver: zodResolver(updateMileageSchema),
    defaultValues: {
      currentMileageKm: vehicle.currentMileageKm,
      recordedAt: new Date().toISOString().split("T")[0],
    }
  });

  const currentMileageWatch = watch("currentMileageKm");
  const displayedMileage = currentMileageWatch ?? vehicle.currentMileageKm;
  const difference = displayedMileage - vehicle.currentMileageKm;

  const onSubmit = async (data: UpdateMileageFormValues) => {
    setError("");
    if (data.currentMileageKm < vehicle.currentMileageKm) {
      setError("ODO mới không được nhỏ hơn ODO cũ.");
      return;
    }
    try {
      await vehicleService.updateMileage(vehicle.id, data);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Cập nhật ODO thất bại");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-xl">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h2 className="text-2xl font-bold">Cập nhật ODO</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full dark:hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm font-medium border border-red-200">
              {error}
            </div>
          )}

          <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl text-sm">
            <div className="flex justify-between mb-2">
              <span className="text-slate-500">ODO hiện tại:</span>
              <span className="font-semibold">{vehicle.currentMileageKm?.toLocaleString()} km</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-slate-500">New mileage:</span>
              <span className="font-semibold">{displayedMileage.toLocaleString()} km</span>
            </div>
            <div className="flex justify-between text-sm text-slate-500 font-medium px-2">
              <span>ODO cũ: {vehicle.currentMileageKm} km</span>
              <span className={difference >= 0 ? "text-green-600" : "text-red-600"}>
                {difference > 0 ? `Tăng thêm: +${difference}` : `Chênh lệch: ${difference}`} km
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Số Km hiện tại (ODO) *</label>
            <input 
              type="number"
              {...register("currentMileageKm", { valueAsNumber: true })} 
              onKeyDown={(e) => {
                if (['-', 'e', 'E', '+', '.', ',', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
                  e.preventDefault();
                }
              }}
              onInput={(e) => {
                if (e.currentTarget.value.length > 6) {
                  e.currentTarget.value = e.currentTarget.value.slice(0, 6);
                }
              }}
              className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none dark:bg-slate-800 dark:border-slate-700" 
            />
            {errors.currentMileageKm && <p className="text-red-500 text-xs mt-1">{errors.currentMileageKm.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Ngày ghi nhận</label>
            <input 
              type="date"
              {...register("recordedAt")} 
              className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none dark:bg-slate-800 dark:border-slate-700" 
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Ghi chú (Không bắt buộc)</label>
            <input 
              {...register("note")} 
              className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none dark:bg-slate-800 dark:border-slate-700" 
              placeholder="Ví dụ: Cập nhật sau bảo dưỡng"
            />
          </div>
          
          <div className="pt-4 border-t flex justify-end gap-3 mt-6">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 rounded-xl border hover:bg-slate-50 font-semibold dark:hover:bg-slate-800 transition"
              disabled={isSubmitting}
            >
              Hủy
            </button>
            <button 
              type="submit" 
              className="px-6 py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition flex items-center gap-2"
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Lưu ODO
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
