import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { editVehicleSchema, type EditVehicleFormValues } from "../../schemas/vehicleSchemas";
import { vehicleService } from "../../services/vehicleService";
import { X, Loader2 } from "lucide-react";
import type { Vehicle } from "../../types/vehicle";

interface EditVehicleDialogProps {
  vehicle: Vehicle;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditVehicleDialog({ vehicle, onClose, onSuccess }: EditVehicleDialogProps) {
  const [error, setError] = useState("");
  const { register, handleSubmit, formState: { isSubmitting }, reset } = useForm<EditVehicleFormValues>({
    resolver: zodResolver(editVehicleSchema),
    defaultValues: {
      brand: vehicle.brand,
      model: vehicle.model,
      color: vehicle.color || "",
      purchaseDate: vehicle.purchaseDate ? vehicle.purchaseDate.split("T")[0] : "",
      currentMileageKm: vehicle.currentMileageKm,
    }
  });

  useEffect(() => {
    reset({
      brand: vehicle.brand,
      model: vehicle.model,
      color: vehicle.color || "",
      purchaseDate: vehicle.purchaseDate ? vehicle.purchaseDate.split("T")[0] : "",
      currentMileageKm: vehicle.currentMileageKm,
    });
  }, [vehicle, reset]);

  const onSubmit = async (data: EditVehicleFormValues) => {
    setError("");
    try {
      await vehicleService.updateVehicle(vehicle.id, data);
      onSuccess();
    } catch (err: any) {
      if (err.code === 'RESOURCE_CONFLICT' || err.message?.includes('unique value')) {
        setError("Mã số khung (VIN) này đã tồn tại trên một xe khác.");
      } else {
        setError(err.message || "Cập nhật xe thất bại");
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-white dark:bg-slate-900 px-6 py-4 border-b flex justify-between items-center z-10">
          <h2 className="text-2xl font-bold">Sửa Thông Tin Xe</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full dark:hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 text-red-700 rounded-xl text-sm font-medium border border-red-200">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold mb-2">Biển số xe</label>
              <input 
                value={vehicle.plateNumber}
                disabled
                className="w-full px-4 py-2 border rounded-xl bg-slate-50 text-slate-500 cursor-not-allowed dark:bg-slate-800/50 dark:border-slate-700" 
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Mã số khung (VIN)</label>
              {vehicle.vin ? (
                <input 
                  value={vehicle.vin}
                  disabled
                  className="w-full px-4 py-2 border rounded-xl bg-slate-50 text-slate-500 cursor-not-allowed dark:bg-slate-800/50 dark:border-slate-700" 
                />
              ) : (
                <input 
                  {...register("vin")}
                  placeholder="Nhập mã số khung"
                  className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none dark:bg-slate-800 dark:border-slate-700" 
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Hãng xe *</label>
              <input 
                value={vehicle.brand}
                disabled
                className="w-full px-4 py-2 border rounded-xl bg-slate-50 text-slate-500 cursor-not-allowed dark:bg-slate-800/50 dark:border-slate-700" 
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Dòng xe *</label>
              <input 
                value={vehicle.model}
                disabled
                className="w-full px-4 py-2 border rounded-xl bg-slate-50 text-slate-500 cursor-not-allowed dark:bg-slate-800/50 dark:border-slate-700" 
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Ngày mua</label>
              <input 
                value={vehicle.purchaseDate ? new Date(vehicle.purchaseDate).toLocaleDateString() : 'Không có'}
                disabled
                className="w-full px-4 py-2 border rounded-xl bg-slate-50 text-slate-500 cursor-not-allowed dark:bg-slate-800/50 dark:border-slate-700" 
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Màu sắc</label>
              <input 
                value={vehicle.color || 'Không có'}
                disabled
                className="w-full px-4 py-2 border rounded-xl bg-slate-50 text-slate-500 cursor-not-allowed dark:bg-slate-800/50 dark:border-slate-700" 
              />
            </div>
          </div>
          
          <div className="pt-4 border-t flex justify-end gap-4 mt-8">
            <button 
              type="button" 
              onClick={onClose}
              className="px-6 py-2 rounded-xl border hover:bg-slate-50 font-semibold dark:hover:bg-slate-800 transition"
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
              Lưu Thay Đổi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
