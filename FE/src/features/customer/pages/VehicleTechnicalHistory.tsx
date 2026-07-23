import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, RefreshCw, Activity, Wrench, RefreshCw as SwapIcon, History as HistoryIcon } from "lucide-react";
import { technicalHistoryService } from "../../../services/technicalHistoryService";
import { formatDate } from "../../../utils/format";
import type { VehicleTechnicalHistory as TechnicalHistoryType } from "../../../types/vehicle-transfer";

export default function VehicleTechnicalHistory() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<TechnicalHistoryType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"swaps" | "batteries" | "maintenance" | "logs">("swaps");

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await technicalHistoryService.getVehicleTechnicalHistory(id);
      setData(res);
    } catch (err: any) {
      setError(err?.message ?? "Không thể tải lịch sử kỹ thuật");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="flex items-center gap-3 font-semibold text-slate-500">
          <RefreshCw className="h-5 w-5 animate-spin" /> Đang tải lịch sử kỹ thuật...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center font-bold text-red-600">{error || "Không tìm thấy lịch sử kỹ thuật xe"}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <button
          onClick={() => navigate(`/app/vehicles/${id}`)}
          className="mb-6 flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Quay lại chi tiết xe
        </button>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">Lịch sử kỹ thuật xe</h1>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Ghi nhận toàn bộ thông số kỹ thuật (lịch sử đổi pin, bảo trì, sức khỏe pin)</p>
          </div>
          <button onClick={load} className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>



        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 mb-6 gap-2 overflow-x-auto">
          {[
            { id: "swaps", label: `Lần đổi pin (${data.swapTransactions.totalElements})`, icon: SwapIcon },
            { id: "batteries", label: `Pin từng gắn (${data.batteryHistory.length})`, icon: HistoryIcon },
            { id: "maintenance", label: `Bảo trì (${data.maintenanceRecords.length})`, icon: Wrench },
            { id: "logs", label: `Nhật ký SoH (${data.healthLogs.length})`, icon: Activity },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as any)}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition whitespace-nowrap ${
                tab === t.id
                  ? "border-emerald-600 text-emerald-700 dark:border-emerald-500 dark:text-emerald-400"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400"
              }`}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab 1: Swap Transactions */}
        {tab === "swaps" && (
          <div className="space-y-3">
            {data.swapTransactions.content.length === 0 ? (
              <div className="app-panel py-12 text-center text-sm font-semibold text-slate-400">Chưa có giao dịch đổi pin nào.</div>
            ) : (
              data.swapTransactions.content.map((swap) => (
                <div key={swap.id} className="app-panel p-5 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="font-extrabold text-slate-900 dark:text-white">Lần đổi pin #{swap.id.slice(-6)}</p>
                    <p className="text-xs font-semibold text-slate-500 mt-1">Mã trạm: {swap.stationId}</p>
                    <p className="text-xs text-slate-400">{formatDate(swap.startedAt)}</p>
                  </div>
                  <div className="flex gap-4 text-sm">
                    {swap.batteryInSoc !== null && (
                      <div className="text-right">
                        <p className="text-xs font-semibold text-slate-400">SoC pin trả</p>
                        <p className="font-bold text-amber-600 dark:text-amber-400">{swap.batteryInSoc}%</p>
                      </div>
                    )}
                    {swap.batteryOutSoc !== null && (
                      <div className="text-right">
                        <p className="text-xs font-semibold text-slate-400">SoC pin nhận</p>
                        <p className="font-bold text-emerald-600 dark:text-emerald-400">{swap.batteryOutSoc}%</p>
                      </div>
                    )}
                    <div className="text-right">
                      <p className="text-xs font-semibold text-slate-400">Trạng thái</p>
                      <p className="font-bold text-slate-700 dark:text-slate-300">{swap.workflowStatus}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 2: Battery History */}
        {tab === "batteries" && (
          <div className="space-y-3">
            {data.batteryHistory.length === 0 ? (
              <div className="app-panel py-12 text-center text-sm font-semibold text-slate-400">Chưa có dữ liệu pin.</div>
            ) : (
              data.batteryHistory.map((bh) => (
                <div key={bh.id} className="app-panel p-5 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-extrabold text-slate-900 dark:text-white">{bh.battery?.batteryCode ?? bh.batteryId}</p>
                      {bh.current && <span className="rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 text-xs font-bold dark:bg-emerald-950 dark:text-emerald-400">Pin hiện tại</span>}
                    </div>
                    <p className="text-xs font-medium text-slate-500 mt-1">Ngày gắn: {formatDate(bh.installedAt)}</p>
                    {bh.removedAt && <p className="text-xs text-slate-400">Ngày tháo: {formatDate(bh.removedAt)}</p>}
                  </div>
                  {bh.battery && (
                    <div className="text-right">
                      <p className="text-xs font-semibold text-slate-400">Sức khỏe pin (SoH)</p>
                      <p className="font-black text-emerald-600 text-base dark:text-emerald-400">{bh.battery.soh}%</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 3: Maintenance Records */}
        {tab === "maintenance" && (
          <div className="space-y-3">
            {data.maintenanceRecords.length === 0 ? (
              <div className="app-panel py-12 text-center text-sm font-semibold text-slate-400">Không có lịch sử bảo trì.</div>
            ) : (
              data.maintenanceRecords.map((m) => (
                <div key={m.id} className="app-panel p-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white">Trạng thái bảo trì: {m.status}</span>
                    <span className="text-xs text-slate-400">{formatDate(m.createdAt)}</span>
                  </div>
                  {m.notes && <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{m.notes}</p>}
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 4: Health Logs */}
        {tab === "logs" && (
          <div className="space-y-3">
            {data.healthLogs.length === 0 ? (
              <div className="app-panel py-12 text-center text-sm font-semibold text-slate-400">Chưa có nhật ký ghi nhận.</div>
            ) : (
              data.healthLogs.map((log) => (
                <div key={log.id} className="app-panel p-4 flex items-center justify-between text-sm">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">SoC: {log.soc}% | SoH: {log.soh}%</p>
                    <p className="text-xs text-slate-500">Nhiệt độ: {log.temperature}°C | Điện áp: {log.voltage}V</p>
                  </div>
                  <span className="text-xs font-medium text-slate-400">{formatDate(log.recordedAt)}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
