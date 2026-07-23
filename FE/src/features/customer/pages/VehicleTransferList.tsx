import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, RefreshCw, ChevronRight } from "lucide-react";
import { vehicleTransferService } from "../../../services/vehicleTransferService";
import { TransferStatusBadge } from "../../../components/vehicle-transfer/TransferStatusBadge";
import { formatDate } from "../../../utils/format";
import type { VehicleTransferRequest, PaginatedResponse } from "../../../types/vehicle-transfer";

const REASON_LABELS: Record<VehicleTransferRequest["requestType"], string> = {
  USED_VEHICLE_PURCHASE: "Mua xe cũ",
  LOST_OLD_ACCOUNT: "Mất tài khoản cũ",
  CHANGED_PHONE_NUMBER: "Đổi SĐT",
  OTHER: "Khác",
};

export default function VehicleTransferList() {
  const navigate = useNavigate();
  const [data, setData] = useState<PaginatedResponse<VehicleTransferRequest> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await vehicleTransferService.getMyRequests({ page, size: 10 });
      setData(result);
    } catch (err: any) {
      setError(err?.message ?? "Không thể tải danh sách yêu cầu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/app/vehicles")}
              className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Danh sách xe
            </button>
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white">Yêu cầu chuyển nhượng</h1>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Theo dõi tiến trình xét duyệt hồ sơ chuyển quyền sở hữu xe</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={load} className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={() => navigate("/app/vehicle-transfer/new")}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4" />
              Tạo yêu cầu mới
            </button>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="flex items-center gap-3 font-semibold text-slate-500">
              <RefreshCw className="h-5 w-5 animate-spin" />
              Đang tải...
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-4 font-bold text-red-600 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400">{error}</div>
        )}

        {!loading && data && data.content.length === 0 && (
          <div className="app-panel flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
              <svg className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-slate-900 font-extrabold text-lg mb-1 dark:text-white">Chưa có yêu cầu nào</h3>
            <p className="text-sm font-medium text-slate-500 mb-6 dark:text-slate-400">Bạn chưa từng gửi yêu cầu chuyển quyền sở hữu xe nào.</p>
            <button
              onClick={() => navigate("/app/vehicle-transfer/new")}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4" />
              Bắt đầu tạo yêu cầu
            </button>
          </div>
        )}

        {!loading && data && data.content.length > 0 && (
          <div className="space-y-3">
            {data.content.map((request) => (
              <button
                key={request.id}
                onClick={() => navigate(`/app/vehicle-transfer/${request.id}`)}
                className="app-panel-hover w-full p-5 text-left transition group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1.5">
                      <span className="font-black text-slate-900 text-base dark:text-white">
                        {request.vehicle?.plateNumber ?? request.vehicleId}
                      </span>
                      {request.vehicle?.brand && (
                        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full dark:bg-slate-800 dark:text-slate-400">
                          {request.vehicle.brand} {request.vehicle.model}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      <span>{REASON_LABELS[request.requestType]}</span>
                      <span>•</span>
                      <span>Tạo ngày {formatDate(request.createdAt)}</span>
                    </div>
                    {request.status === "NEED_MORE_INFORMATION" && request.additionalInfoRequest && (
                      <div className="mt-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-bold text-orange-700 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-300">
                        ⚠️ Cần hành động: {request.additionalInfoRequest}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <TransferStatusBadge status={request.status} size="sm" />
                    <ChevronRight className="h-5 w-5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </button>
            ))}

            {/* Pagination */}
            {data.totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 pt-4">
                <button
                  disabled={data.first}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                >
                  Trang trước
                </button>
                <span className="text-sm font-bold text-slate-500">
                  {page + 1} / {data.totalPages}
                </span>
                <button
                  disabled={data.last}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                >
                  Trang sau
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
