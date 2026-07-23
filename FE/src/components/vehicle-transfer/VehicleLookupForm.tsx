import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Search, Car } from "lucide-react";
import { vehicleLookupService } from "../../services/vehicleLookupService";
import type { VehicleLookupResponse } from "../../types/vehicle-transfer";

const schema = z.object({
  searchType: z.enum(["vin", "plateNumber"]),
  value: z.string().min(1, "Vui lòng nhập thông tin tìm kiếm").max(100),
});

type FormValues = z.infer<typeof schema>;

interface VehicleLookupFormProps {
  onResult: (result: VehicleLookupResponse, searchValue: string) => void;
}

export function VehicleLookupForm({ onResult }: VehicleLookupFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { searchType: "plateNumber", value: "" },
  });

  const searchType = watch("searchType");

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    setError(null);
    try {
      let result: VehicleLookupResponse;
      if (data.searchType === "vin") {
        result = await vehicleLookupService.lookupByVin(data.value.toUpperCase().trim());
      } else {
        result = await vehicleLookupService.lookupByPlate(data.value.toUpperCase().trim());
      }
      onResult(result, data.value);
    } catch (err: any) {
      setError(err?.message ?? "Không thể tìm kiếm xe. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Search type selector */}
      <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 gap-1 dark:bg-slate-800 dark:border-slate-700">
        {(["plateNumber", "vin"] as const).map((type) => (
          <label
            key={type}
            className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-extrabold transition ${
              searchType === type
                ? "bg-white text-emerald-700 shadow-sm dark:bg-slate-900 dark:text-emerald-400"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
            }`}
          >
            <input {...register("searchType")} type="radio" value={type} className="sr-only" />
            {type === "plateNumber" ? <Car className="h-4 w-4" /> : <Search className="h-4 w-4" />}
            {type === "plateNumber" ? "Biển số xe" : "Số VIN (Khung xe)"}
          </label>
        ))}
      </div>

      {/* Search input */}
      <div className="space-y-1.5">
        <label className="block text-sm font-bold text-slate-800 dark:text-slate-200">
          {searchType === "plateNumber" ? "Biển số xe" : "Mã số VIN (Vehicle Identification Number)"}
        </label>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            {...register("value")}
            type="text"
            placeholder={searchType === "plateNumber" ? "Ví dụ: 30A-12345" : "Ví dụ: 1HGBH41JXMN109186"}
            className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-slate-900 font-medium placeholder-slate-400 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 uppercase dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>
        {errors.value && (
          <p className="text-xs font-semibold text-red-500">{errors.value.message}</p>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-600 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-emerald-600 py-3.5 px-6 font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Đang tìm kiếm...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <Search className="h-4 w-4" />
            Tra cứu xe
          </span>
        )}
      </button>
    </form>
  );
}
