import { Link } from "react-router-dom";
import { Car, Battery, Gauge, Eye, CalendarPlus, ShieldCheck } from "lucide-react";
import type { Vehicle } from "../../types/vehicle";
const extractBatteryCode = (code: string | undefined | null) => {
  if (!code) return 'Chưa có Pin';
  if (code.includes('batteryCode=')) {
    const match = code.match(/batteryCode=([^&]*)/);
    if (match && match[1]) return match[1];
  }
  return code.split('/').pop() || code;
};

const formatMileage = (mileage: number | null | undefined) =>
  typeof mileage === "number" && Number.isFinite(mileage)
    ? `${mileage.toLocaleString()} km`
    : "Chưa cập nhật";

const formatSoh = (soh: number | null | undefined) =>
  typeof soh === "number" && Number.isFinite(soh)
    ? `${soh.toFixed(2)}%`
    : "0%";

interface VehicleCardProps {
  vehicle: Vehicle;
}

export function VehicleCard({ vehicle }: VehicleCardProps) {
  const { currentBattery } = vehicle;

  const requiresReplacement = Boolean(
    currentBattery && (
      (typeof currentBattery.estimatedSoH === "number" && currentBattery.estimatedSoH < 70)
      || currentBattery.healthClassification === "UNSAFE"
      || currentBattery.healthClassification === "REPLACEMENT_REQUIRED"
      || currentBattery.status === "QUARANTINED"
    )
  );
  const needsAttention = Boolean(
    currentBattery && (
      requiresReplacement
      || currentBattery.healthClassification === "NEEDS_MAINTENANCE"
      || currentBattery.healthClassification === "LIMITED"
      || currentBattery.status === "MAINTENANCE"
    )
  );

  return (
    <div className={`border bg-white p-4 transition hover:border-blue-400 dark:bg-slate-900 ${needsAttention ? 'border-l-4 border-red-400' : 'border-slate-200 dark:border-slate-700'}`}>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
        <div className="flex min-w-0 items-start gap-3 xl:w-56 xl:flex-none">
          <div className="rounded-lg bg-slate-100 p-2.5 dark:bg-slate-800 mt-1">
            <Car className="h-7 w-7 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide ${vehicle.status === 'ACTIVE' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }`}>
                {vehicle.status === 'ACTIVE' ? 'Hoạt động' : 'Không hoạt động'}
              </span>
            </div>
            <h2 className="truncate text-lg font-bold leading-tight">
              {[vehicle.brand, vehicle.model].filter(Boolean).join(" ") || "Xe chưa cập nhật thông tin"}
            </h2>
            <p className="font-mono text-sm font-semibold text-slate-500 mt-0.5">{vehicle.plateNumber}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-4 xl:flex-1 pl-4 xl:pl-0 border-l xl:border-l-0 border-slate-100 dark:border-slate-800">
          <div className="w-24 xl:w-28">
            <span className="mb-1 block text-xs text-slate-500">Số km</span>
            <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
              <Gauge className="h-4 w-4 flex-none text-slate-400" />
              <span className="truncate">{formatMileage(vehicle.currentMileageKm)}</span>
            </span>
          </div>
          <div className="w-40 xl:w-48">
            <span className="mb-1 block text-xs text-slate-500">Mã Pin</span>
            <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
              <Battery className="h-4 w-4 flex-none text-slate-400" />
              <span className="truncate">{currentBattery ? extractBatteryCode(currentBattery.batteryCode) : 'Chưa có Pin'}</span>
            </span>
          </div>
          <div className="w-24 xl:w-28">
            <span className="mb-1 block text-xs text-slate-500">Trạng thái Pin</span>
            <span className={`block text-sm font-semibold truncate ${!currentBattery ? 'text-slate-500' :
                requiresReplacement ? 'text-red-600' :
                  currentBattery.healthClassification === 'NEEDS_MAINTENANCE' || currentBattery.healthClassification === 'LIMITED' ? 'text-orange-500' :
                    'text-green-600'
              }`}>
              {currentBattery ? (
                requiresReplacement ? 'Yêu cầu thay' :
                  currentBattery.healthClassification === 'NEEDS_MAINTENANCE' || currentBattery.healthClassification === 'LIMITED' ? 'Cần kiểm tra' :
                    'An toàn'
              ) : 'Không có'}
            </span>
          </div>
          <div className="w-20 xl:w-24">
            <span className="mb-1 block text-xs text-slate-500 truncate">Sức khỏe (SoH)</span>
            <span className="text-sm font-bold text-blue-600 dark:text-blue-400 truncate block">
              {formatSoh(currentBattery?.estimatedSoH)}
            </span>
          </div>
          <div className="w-28 xl:w-32">
            <span className="mb-1 block text-xs text-slate-500 truncate">Trạng thái sửa chữa</span>
            <span className="block text-sm font-semibold text-slate-700 dark:text-slate-300 truncate">
              {vehicle.status === 'IN_SWAP_PROCESS' ? 'Đang thay pin' :
                vehicle.status === 'IN_SERVICE' ? 'Đang kiểm tra' :
                  'Không'}
            </span>
          </div>
        </div>


        <div className="flex items-center gap-2 sm:flex-row xl:w-auto xl:flex-none shrink-0 border-t xl:border-t-0 pt-4 xl:pt-0 border-slate-100 dark:border-slate-800 ml-auto">
          <Link
            to={`/app/vehicles/${vehicle.id}`}
            title="Xem chi tiết"
            className="flex flex-col items-center justify-center gap-1 min-w-[72px] p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-blue-600 transition dark:hover:bg-slate-800"
          >
            <Eye className="w-5 h-5" />
            <span className="text-[10px] font-semibold uppercase tracking-wider">Chi tiết</span>
          </Link>
          <Link
            to={`/app/battery-health/current?vehicleId=${vehicle.id}`}
            title="Sức khỏe pin"
            className="flex flex-col items-center justify-center gap-1 min-w-[72px] p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-green-600 transition dark:hover:bg-slate-800"
          >
            <ShieldCheck className="w-5 h-5" />
            <span className="text-[10px] font-semibold uppercase tracking-wider">Sức khỏe</span>
          </Link>
          {vehicle.status === 'ACTIVE' && vehicle.swapEligible ? (
            <Link
              to={`/app/bookings/new?vehicleId=${vehicle.id}`}
              title="Đặt lịch đổi pin"
              className="flex flex-col items-center justify-center gap-1 min-w-[72px] p-2 rounded-xl text-blue-600 hover:bg-blue-50 transition dark:hover:bg-slate-800"
            >
              <CalendarPlus className="w-5 h-5" />
              <span className="text-[10px] font-semibold uppercase tracking-wider">Đổi pin</span>
            </Link>
          ) : (
            <button disabled title={vehicle.status !== 'ACTIVE' ? 'Xe đang tắt, hãy bật lại để đặt lịch' : 'Không thể đổi pin'} className="flex flex-col items-center justify-center gap-1 min-w-[72px] p-2 rounded-xl text-slate-300 cursor-not-allowed">
              <CalendarPlus className="w-5 h-5" />
              <span className="text-[10px] font-semibold uppercase tracking-wider">Đổi pin</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
