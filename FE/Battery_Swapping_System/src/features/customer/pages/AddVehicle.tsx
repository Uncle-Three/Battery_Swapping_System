import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Car, ArrowLeft, Plus } from "lucide-react";
import { VehicleLookupForm } from "../../../components/vehicle-transfer/VehicleLookupForm";
import { ExistingOwnerWarning } from "../../../components/vehicle-transfer/ExistingOwnerWarning";
import type { VehicleLookupResponse } from "../../../types/vehicle-transfer";

export default function AddVehicle() {
  const navigate = useNavigate();
  const [lookupResult, setLookupResult] = useState<VehicleLookupResponse | null>(null);
  const [step, setStep] = useState<"lookup" | "result" | "register">("lookup");

  const handleLookupResult = (result: VehicleLookupResponse) => {
    setLookupResult(result);
    setStep("result");
  };

  const handleRequestTransfer = () => {
    if (lookupResult?.vehicle) {
      navigate(`/app/vehicle-transfer/new?vehicleId=${lookupResult.vehicle.id}`);
    }
  };

  const handleRegister = () => {
    navigate("/app/vehicles", { state: { openAddModal: true } });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => step === "result" ? setStep("lookup") : navigate("/app/vehicles")}
            className="mb-6 flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            {step === "result" ? "Tìm kiếm lại" : "Quay lại danh sách xe"}
          </button>

          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800">
              <Car className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white">Thêm xe vào tài khoản</h1>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Tra cứu trước để kiểm tra thông tin xe trong hệ thống</p>
            </div>
          </div>
        </div>

        {/* Step: Lookup */}
        {step === "lookup" && (
          <div className="app-panel p-6 sm:p-8 space-y-6">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white mb-1">Bước 1: Tra cứu thông tin xe</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Nhập biển số xe hoặc mã số VIN để kiểm tra xem xe đã được đăng ký trên hệ thống chưa.
              </p>
            </div>
            <VehicleLookupForm onResult={handleLookupResult} />
          </div>
        )}

        {/* Step: Result */}
        {step === "result" && lookupResult && (
          <div className="space-y-6">
            {/* Vehicle info card if found */}
            {lookupResult.found && lookupResult.vehicle && (
              <div className="app-panel p-6">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Thông tin xe tìm thấy</h3>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {[
                    { label: "Biển số", value: lookupResult.vehicle.plateNumber },
                    { label: "Hãng xe", value: lookupResult.vehicle.brand || "—" },
                    { label: "Dòng xe", value: lookupResult.vehicle.model || "—" },
                    { label: "Năm sản xuất", value: lookupResult.vehicle.manufactureYear?.toString() || "—" },
                    { label: "Loại pin", value: lookupResult.vehicle.batteryType },
                    { label: "Số VIN", value: lookupResult.vehicle.vinNumber || "—" },
                  ].map((item) => (
                    <div key={item.label}>
                      <p className="text-xs text-slate-500">{item.label}</p>
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <ExistingOwnerWarning
              lookup={lookupResult}
              onRequestTransfer={handleRequestTransfer}
            />

            {/* If not found — offer to register */}
            {!lookupResult.found && (
              <div className="app-panel p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                    <Plus className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 dark:text-white">Đăng ký xe mới</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      Xe này chưa có trong hệ thống. Bạn có thể tiến hành đăng ký mới ngay.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleRegister}
                  className="w-full rounded-xl bg-emerald-600 py-3.5 px-6 font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700"
                >
                  Đăng ký xe mới ngay
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
