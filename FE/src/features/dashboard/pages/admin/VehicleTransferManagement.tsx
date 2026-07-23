import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { RefreshCw, Search, ArrowRight } from "lucide-react";
import { adminVehicleTransferService } from "../../../../services/adminVehicleTransferService";
import { TransferStatusBadge } from "../../../../components/vehicle-transfer/TransferStatusBadge";
import { formatDate } from "../../../../utils/format";
import type { VehicleTransferRequest, PaginatedResponse } from "../../../../types/vehicle-transfer";

const STATUSES = ["PENDING", "UNDER_REVIEW", "NEED_MORE_INFORMATION", "APPROVED", "REJECTED", "CANCELLED"] as const;

const REASON_LABELS: Record<VehicleTransferRequest["requestType"], string> = {
  USED_VEHICLE_PURCHASE: "Mua xe cũ",
  LOST_OLD_ACCOUNT: "Mất tài khoản cũ",
  CHANGED_PHONE_NUMBER: "Đổi SĐT",
  OTHER: "Khác",
};

export default function VehicleTransferManagement() {
  const navigate = useNavigate();
  const [data, setData] = useState<PaginatedResponse<VehicleTransferRequest> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await adminVehicleTransferService.listRequests({
        status: statusFilter as any || undefined,
        plateNumber: search || undefined,
        page,
        size: 20,
      });
      setData(result);
    } catch (err: any) {
      setError(err?.message ?? "Không thể tải danh sách yêu cầu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page, statusFilter, search]);

  const counts = (data?.content ?? []).reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">Yêu cầu Chuyển quyền sở hữu Xe</h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5">Duyệt và xử lý các hồ sơ chuyển nhượng xe trong hệ thống</p>
        </div>
        <button onClick={load} className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Chờ xử lý", status: "PENDING", color: "text-amber-700 dark:text-amber-400", bg: "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800" },
          { label: "Đang xem xét", status: "UNDER_REVIEW", color: "text-blue-700 dark:text-blue-400", bg: "bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800" },
          { label: "Cần bổ sung", status: "NEED_MORE_INFORMATION", color: "text-orange-700 dark:text-orange-400", bg: "bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-800" },
          { label: "Đã phê duyệt", status: "APPROVED", color: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800" },
        ].map((s) => (
          <button
            key={s.status}
            onClick={() => setStatusFilter(statusFilter === s.status ? "" : s.status)}
            className={`rounded-2xl border p-4 text-left transition hover:shadow-sm ${s.bg} ${statusFilter === s.status ? "ring-2 ring-emerald-500" : ""}`}
          >
            <p className={`text-2xl font-black ${s.color}`}>{data?.totalElements ? counts[s.status] ?? 0 : "—"}</p>
            <p className="text-xs font-extrabold text-slate-600 dark:text-slate-400 mt-0.5">{s.label}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { setSearch(searchInput); setPage(0); } }}
            placeholder="Tìm theo biển số xe..."
            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-4 text-sm text-slate-900 font-medium placeholder-slate-400 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
        >
          <option value="">Tất cả trạng thái</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Error */}
      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-600 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400">{error}</div>}

      {/* Table */}
      <div className="app-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50">
                {["Biển số xe / VIN", "Người yêu cầu ID", "Lý do", "Trạng thái", "Ngày gửi", ""].map((h) => (
                  <th key={h} className="px-5 py-3.5 text-left text-xs font-extrabold uppercase tracking-wider text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-slate-400 font-semibold">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />Đang tải dữ liệu...
                  </td>
                </tr>
              )}
              {!loading && (!data || data.content.length === 0) && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-slate-400 font-medium">Không tìm thấy yêu cầu chuyển nhượng nào.</td>
                </tr>
              )}
              {!loading && data?.content.map((request) => (
                <tr key={request.id} className="transition hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                  <td className="px-5 py-4">
                    <p className="font-black text-slate-900 dark:text-white">{request.vehicle?.plateNumber ?? "—"}</p>
                    <p className="text-xs text-slate-500">{request.vehicle?.vinNumber ?? request.vehicleId}</p>
                  </td>
                  <td className="px-5 py-4 text-xs font-mono text-slate-600 dark:text-slate-400">{request.requestedOwnerId.slice(0, 12)}...</td>
                  <td className="px-5 py-4 text-sm font-semibold text-slate-700 dark:text-slate-300">{REASON_LABELS[request.requestType]}</td>
                  <td className="px-5 py-4">
                    <TransferStatusBadge status={request.status} size="sm" />
                  </td>
                  <td className="px-5 py-4 text-xs font-medium text-slate-500">
                    {request.submittedAt ? formatDate(request.submittedAt) : "Chưa gửi"}
                  </td>
                  <td className="px-5 py-4">
                    <button
                      onClick={() => navigate(`/admin/vehicle-transfers/${request.id}`)}
                      className="flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                    >
                      Xét duyệt <ArrowRight className="h-3 w-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3 dark:border-slate-800">
            <p className="text-xs font-semibold text-slate-500">Tổng cộng {data.totalElements} hồ sơ</p>
            <div className="flex items-center gap-2">
              <button disabled={data.first} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300">Trước</button>
              <span className="text-xs font-bold text-slate-500">{page + 1} / {data.totalPages}</span>
              <button disabled={data.last} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300">Sau</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
