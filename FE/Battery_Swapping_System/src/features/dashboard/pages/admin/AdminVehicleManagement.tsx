import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BatteryCharging,
  Car,
  ChevronDown,
  Filter,
  Lock,
  MoreHorizontal,
  RefreshCw,
  Search,
  ShieldAlert,
  UserRoundCheck,
  Wrench,
} from "lucide-react";
import { useAdminVehicles } from "../../../../hooks/useAdminVehicles";
import {
  deactivateVehicle,
  lockVehicle,
  markVehicleNeedsInspection,
  unlockVehicle,
} from "../../../../services/adminVehicleApi";
import { getApiErrorMessage } from "../../../../services/apiClient";
import type {
  AdminVehicleFilters,
  AdminVehicleListItem,
  AdminVehicleStatus,
  LockVehiclePayload,
} from "../../../../types/adminVehicle";
import {
  BatteryHealthBadge,
  TransferStatusBadge,
  VehicleStatusBadge,
} from "../../../../components/admin-vehicles/VehicleBadges";
import { VehicleActionModal } from "../../../../components/admin-vehicles/VehicleActionModal";

const defaultFilters: AdminVehicleFilters = {
  page: 1,
  limit: 10,
  sortBy: "createdAt",
  sortOrder: "desc",
};
const statuses: Array<{ value: AdminVehicleStatus; label: string }> = [
  { value: "ACTIVE", label: "Hoạt động" },
  { value: "NEEDS_INSPECTION", label: "Cần kiểm tra" },
  { value: "UNSAFE", label: "Pin không an toàn" },
  { value: "SWAP_PENDING", label: "Đang chờ đổi pin" },
  { value: "MAINTENANCE", label: "Đang bảo trì" },
  { value: "TRANSFER_PENDING", label: "Đang chuyển quyền" },
  { value: "LOCKED", label: "Bị khóa" },
  { value: "INACTIVE", label: "Ngừng hoạt động" },
];
const inputClass =
  "rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white";
const compactVin = (vin: string | null) =>
  !vin
    ? "Chưa có VIN"
    : vin.length > 16
      ? `${vin.slice(0, 11)}...${vin.slice(-4)}`
      : vin;
const date = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("vi-VN").format(new Date(value))
    : "Chưa kiểm tra";

type ActionKind = "lock" | "unlock" | "inspect" | "deactivate";
const actionCopy: Record<ActionKind, { title: string; description: string }> = {
  lock: {
    title: "Khóa xe",
    description:
      "Xe bị khóa sẽ không thể tạo lịch đổi pin hoặc hoàn tất chuyển quyền sở hữu.",
  },
  unlock: {
    title: "Mở khóa xe",
    description:
      "Hệ thống sẽ khôi phục trạng thái phù hợp; xe có pin không an toàn sẽ không được kích hoạt.",
  },
  inspect: {
    title: "Đánh dấu cần kiểm tra",
    description:
      "Trạng thái xe sẽ chuyển sang “Cần kiểm tra” và chủ xe sẽ nhận thông báo.",
  },
  deactivate: {
    title: "Ngừng hoạt động xe",
    description:
      "Xe được lưu trữ dưới dạng ngừng hoạt động; toàn bộ lịch sử kỹ thuật vẫn được giữ nguyên.",
  },
};

export default function AdminVehicleManagement() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<AdminVehicleFilters>(defaultFilters);
  const [draft, setDraft] = useState<AdminVehicleFilters>(defaultFilters);
  const [searchInput, setSearchInput] = useState("");
  const [advanced, setAdvanced] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [menuPlacement, setMenuPlacement] = useState<"top" | "bottom">(
    "bottom",
  );
  const [action, setAction] = useState<{
    kind: ActionKind;
    vehicle: AdminVehicleListItem;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { data, loading, error, refresh } = useAdminVehicles(filters);
  useEffect(() => {
    const timer = window.setTimeout(
      () =>
        setFilters((current) => ({
          ...current,
          search: searchInput.trim() || undefined,
          page: 1,
        })),
      400,
    );
    return () => window.clearTimeout(timer);
  }, [searchInput]);
  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node))
        setMenuId(null);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  const activeFilterCount = useMemo(
    () =>
      [
        "batterySafety",
        "transferStatus",
        "manufacturer",
        "model",
        "productionYear",
        "minOdo",
        "maxOdo",
        "minSoh",
        "maxSoh",
        "createdFrom",
        "createdTo",
      ].filter(
        (key) =>
          draft[key as keyof AdminVehicleFilters] !== undefined &&
          draft[key as keyof AdminVehicleFilters] !== "",
      ).length,
    [draft],
  );
  const apply = () => {
    setFilters({
      ...draft,
      search: filters.search,
      status: filters.status,
      page: 1,
    });
    setAdvanced(false);
  };
  const reset = () => {
    setDraft(defaultFilters);
    setFilters({
      ...defaultFilters,
      search: filters.search,
      status: filters.status,
    });
  };
  const runAction = async (value: {
    reason: string;
    notes?: string;
    category?: string;
  }) => {
    if (!action) return;
    setActionLoading(true);
    setMessage(null);
    try {
      if (action.kind === "lock")
        await lockVehicle(action.vehicle.id, {
          ...value,
          category: value.category as LockVehiclePayload["category"],
        });
      if (action.kind === "unlock")
        await unlockVehicle(action.vehicle.id, value);
      if (action.kind === "inspect")
        await markVehicleNeedsInspection(action.vehicle.id, value);
      if (action.kind === "deactivate")
        await deactivateVehicle(action.vehicle.id, value);
      setMessage({
        type: "success",
        text: "Cập nhật trạng thái xe thành công.",
      });
      setAction(null);
      await refresh();
    } catch (cause) {
      setMessage({
        type: "error",
        text: getApiErrorMessage(cause, "Không thể cập nhật xe."),
      });
    } finally {
      setActionLoading(false);
    }
  };
  const toggleActionMenu = (
    vehicleId: string,
    trigger: HTMLButtonElement,
  ) => {
    if (menuId === vehicleId) {
      setMenuId(null);
      return;
    }

    const triggerRect = trigger.getBoundingClientRect();
    const estimatedMenuHeight = 280;
    const viewportPadding = 16;
    const availableBelow = window.innerHeight - triggerRect.bottom - viewportPadding;
    const availableAbove = triggerRect.top - viewportPadding;

    setMenuPlacement(
      availableBelow < estimatedMenuHeight && availableAbove > availableBelow
        ? "top"
        : "bottom",
    );
    setMenuId(vehicleId);
  };
  const statCards = [
    {
      label: "Tổng số xe",
      value: data?.statistics.total,
      icon: Car,
      color: "text-slate-700",
      status: undefined,
    },
    {
      label: "Đang hoạt động",
      value: data?.statistics.active,
      icon: BatteryCharging,
      color: "text-emerald-600",
      status: "ACTIVE" as const,
    },
    {
      label: "Cần kiểm tra",
      value: data?.statistics.needsInspection,
      icon: Wrench,
      color: "text-amber-600",
      status: "NEEDS_INSPECTION" as const,
    },
    {
      label: "Pin không an toàn",
      value: data?.statistics.unsafe,
      icon: ShieldAlert,
      color: "text-red-600",
      status: "UNSAFE" as const,
    },
    {
      label: "Đang chuyển quyền",
      value: data?.statistics.transferPending,
      icon: UserRoundCheck,
      color: "text-cyan-600",
      status: "TRANSFER_PENDING" as const,
    },
    {
      label: "Bị khóa",
      value: data?.statistics.locked,
      icon: Lock,
      color: "text-rose-600",
      status: "LOCKED" as const,
    },
  ];
  return (
    <div className="w-full space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">
            Quản lý xe
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Theo dõi tình trạng kỹ thuật, quyền sở hữu và hoạt động của xe.
          </p>
        </div>
        <button
          onClick={() => void refresh()}
          aria-label="Làm mới danh sách"
          className="grid h-10 w-10 place-items-center rounded-xl border bg-white dark:border-slate-700 dark:bg-slate-900"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {statCards.map(({ label, value, icon: Icon, color, status }) => (
          <button
            key={label}
            onClick={() =>
              setFilters((current) => ({ ...current, status, page: 1 }))
            }
            className={`rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 ${filters.status === status && status ? "ring-2 ring-emerald-500" : ""}`}
          >
            <div className="flex items-center justify-between">
              <p className={`text-2xl font-black ${color}`}>
                {loading && !data ? "—" : (value ?? 0)}
              </p>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <p className="mt-1 text-xs font-bold text-slate-500">{label}</p>
          </button>
        ))}
      </div>
      <div className="rounded-2xl border bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap gap-3">
          <div className="relative min-w-[260px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              className={`${inputClass} w-full pl-9`}
              placeholder="Biển số, VIN, mẫu xe, chủ xe, email, SĐT hoặc QR..."
              aria-label="Tìm kiếm xe"
            />
          </div>
          <select
            value={filters.status ?? ""}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                status: (event.target.value || undefined) as
                  AdminVehicleStatus | undefined,
                page: 1,
              }))
            }
            className={inputClass}
          >
            <option value="">Tất cả trạng thái</option>
            {statuses.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => setAdvanced((value) => !value)}
            className="flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold"
          >
            <Filter className="h-4 w-4" /> Bộ lọc nâng cao{" "}
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-emerald-600 px-2 text-xs text-white">
                {activeFilterCount}
              </span>
            )}
            <ChevronDown
              className={`h-4 w-4 transition ${advanced ? "rotate-180" : ""}`}
            />
          </button>
        </div>
        {advanced && (
          <div className="mt-4 grid gap-3 border-t pt-4 sm:grid-cols-2 lg:grid-cols-4">
            <select
              value={draft.batterySafety ?? ""}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  batterySafety: (e.target.value ||
                    undefined) as AdminVehicleFilters["batterySafety"],
                })
              }
              className={inputClass}
            >
              <option value="">An toàn pin</option>
              <option value="SAFE">An toàn</option>
              <option value="WARNING">Cần theo dõi</option>
              <option value="UNSAFE">Không an toàn</option>
              <option value="NO_DATA">Chưa có dữ liệu</option>
            </select>
            <select
              value={draft.transferStatus ?? ""}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  transferStatus: (e.target.value ||
                    undefined) as AdminVehicleFilters["transferStatus"],
                })
              }
              className={inputClass}
            >
              <option value="">Chuyển quyền</option>
              <option value="NONE">Không có yêu cầu</option>
              <option value="PENDING">Chờ duyệt</option>
              <option value="UNDER_REVIEW">Đang kiểm tra</option>
              <option value="NEED_MORE_INFORMATION">Cần bổ sung</option>
              <option value="APPROVED">Đã duyệt</option>
              <option value="REJECTED">Từ chối</option>
            </select>
            <input
              className={inputClass}
              placeholder="Hãng xe"
              value={draft.manufacturer ?? ""}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  manufacturer: e.target.value || undefined,
                })
              }
            />
            <input
              className={inputClass}
              placeholder="Mẫu xe"
              value={draft.model ?? ""}
              onChange={(e) =>
                setDraft({ ...draft, model: e.target.value || undefined })
              }
            />
            <input
              className={inputClass}
              type="number"
              placeholder="Năm sản xuất"
              value={draft.productionYear ?? ""}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  productionYear: e.target.value
                    ? Number(e.target.value)
                    : undefined,
                })
              }
            />
            <input
              className={inputClass}
              type="number"
              placeholder="ODO từ (km)"
              value={draft.minOdo ?? ""}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  minOdo: e.target.value ? Number(e.target.value) : undefined,
                })
              }
            />
            <input
              className={inputClass}
              type="number"
              placeholder="ODO đến (km)"
              value={draft.maxOdo ?? ""}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  maxOdo: e.target.value ? Number(e.target.value) : undefined,
                })
              }
            />
            <div className="flex gap-2">
              <input
                className={`${inputClass} min-w-0 flex-1`}
                type="number"
                placeholder="SoH từ %"
                value={draft.minSoh ?? ""}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    minSoh: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
              />
              <input
                className={`${inputClass} min-w-0 flex-1`}
                type="number"
                placeholder="đến %"
                value={draft.maxSoh ?? ""}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    maxSoh: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
              />
            </div>
            <div className="flex gap-2 sm:col-span-2 lg:col-start-3">
              <button
                onClick={reset}
                className="flex-1 rounded-xl border px-4 py-2 text-sm font-bold"
              >
                Đặt lại
              </button>
              <button
                onClick={apply}
                className="flex-1 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white"
              >
                Áp dụng bộ lọc
              </button>
            </div>
          </div>
        )}
      </div>
      {(error || message) && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm font-semibold ${error || message?.type === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}
        >
          {error ?? message?.text}
        </div>
      )}
      <div className="overflow-visible rounded-2xl border bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px]">
            <thead>
              <tr className="border-b bg-slate-50 text-left dark:border-slate-800 dark:bg-slate-800/50">
                {[
                  "Xe",
                  "Chủ sở hữu",
                  "ODO",
                  "Tình trạng pin",
                  "Trạng thái xe",
                  "Chuyển quyền",
                  "Ngày tạo",
                  "Thao tác",
                ].map((head) => (
                  <th
                    key={head}
                    className="px-4 py-3 text-xs font-extrabold uppercase tracking-wide text-slate-500"
                  >
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-slate-800">
              {loading &&
                !data &&
                Array.from({ length: 5 }, (_, index) => (
                  <tr key={index}>
                    {Array.from({ length: 8 }, (__, cell) => (
                      <td key={cell} className="px-4 py-5">
                        <div className="h-4 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                      </td>
                    ))}
                  </tr>
                ))}
              {!loading && data?.items.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center">
                    <Car className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                    <p className="font-bold text-slate-600">
                      Không tìm thấy xe phù hợp
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      Thử thay đổi từ khóa hoặc đặt lại bộ lọc.
                    </p>
                  </td>
                </tr>
              )}
              {data?.items.map((vehicle) => (
                <tr
                  key={vehicle.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/40"
                >
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 place-items-center overflow-hidden rounded-xl bg-slate-100">
                        {vehicle.imageUrl ? (
                          <img
                            src={vehicle.imageUrl}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Car className="h-5 w-5 text-slate-500" />
                        )}
                      </div>
                      <div>
                        <button
                          onClick={() =>
                            navigate(`/admin/vehicles/${vehicle.id}`)
                          }
                          className="font-black text-slate-900 hover:text-emerald-600 dark:text-white"
                        >
                          {vehicle.plateNumber}
                        </button>
                        <p className="max-w-[210px] truncate text-xs text-slate-500">
                          {vehicle.model || "Chưa rõ mẫu"} ·{" "}
                          {compactVin(vehicle.vinNumber)}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                      {vehicle.owner.fullName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {vehicle.owner.email}
                    </p>
                    {vehicle.owner.phone && (
                      <p className="text-xs text-slate-400">
                        {vehicle.owner.phone}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-4 text-sm font-semibold">
                    {vehicle.odo.toLocaleString("vi-VN")} km
                  </td>
                  <td className="px-4 py-4">
                    {vehicle.battery ? (
                      <>
                        <BatteryHealthBadge
                          status={vehicle.battery.safetyStatus}
                          soh={vehicle.battery.soh}
                        />
                        <p className="mt-1 text-xs text-slate-400">
                          SoC {vehicle.battery.soc}% ·{" "}
                          {date(vehicle.battery.lastInspectionAt)}
                        </p>
                      </>
                    ) : (
                      <BatteryHealthBadge status="NO_DATA" />
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <VehicleStatusBadge status={vehicle.status} />
                  </td>
                  <td className="px-4 py-4">
                    {vehicle.transfer ? (
                      <button
                        onClick={() =>
                          navigate(
                            `/admin/vehicle-transfers/${vehicle.transfer?.id}`,
                          )
                        }
                        className="hover:text-emerald-600"
                      >
                        <TransferStatusBadge status={vehicle.transfer.status} />
                      </button>
                    ) : (
                      <TransferStatusBadge status="NONE" />
                    )}
                  </td>
                  <td className="px-4 py-4 text-xs text-slate-500">
                    {date(vehicle.createdAt)}
                  </td>
                  <td className="relative px-4 py-4">
                    <button
                      aria-label={`Thao tác với xe ${vehicle.plateNumber}`}
                      aria-expanded={menuId === vehicle.id}
                      onClick={(event) =>
                        toggleActionMenu(vehicle.id, event.currentTarget)
                      }
                      className="grid h-9 w-9 place-items-center rounded-lg hover:bg-slate-100"
                    >
                      <MoreHorizontal className="h-5 w-5" />
                    </button>
                    {menuId === vehicle.id && (
                      <div
                        ref={menuRef}
                        className={`absolute right-4 z-30 w-60 rounded-xl border bg-white p-1.5 text-sm shadow-xl dark:border-slate-700 dark:bg-slate-900 ${
                          menuPlacement === "top" ? "bottom-12" : "top-12"
                        }`}
                      >
                        <button
                          onClick={() =>
                            navigate(`/admin/vehicles/${vehicle.id}`)
                          }
                          className="w-full rounded-lg px-3 py-2 text-left font-semibold hover:bg-slate-100"
                        >
                          Xem chi tiết
                        </button>
                        {vehicle.transfer && (
                          <button
                            onClick={() =>
                              navigate(
                                `/admin/vehicle-transfers/${vehicle.transfer?.id}`,
                              )
                            }
                            className="w-full rounded-lg px-3 py-2 text-left hover:bg-slate-100"
                          >
                            Xem yêu cầu chuyển quyền
                          </button>
                        )}
                        {!["NEEDS_INSPECTION", "INACTIVE"].includes(
                          vehicle.status,
                        ) && (
                          <button
                            onClick={() => {
                              setAction({ kind: "inspect", vehicle });
                              setMenuId(null);
                            }}
                            className="w-full rounded-lg px-3 py-2 text-left hover:bg-slate-100"
                          >
                            Đánh dấu cần kiểm tra
                          </button>
                        )}
                        {vehicle.status === "LOCKED" ? (
                          <button
                            onClick={() => {
                              setAction({ kind: "unlock", vehicle });
                              setMenuId(null);
                            }}
                            className="w-full rounded-lg px-3 py-2 text-left text-emerald-700 hover:bg-emerald-50"
                          >
                            Mở khóa xe
                          </button>
                        ) : (
                          vehicle.status !== "INACTIVE" && (
                            <button
                              onClick={() => {
                                setAction({ kind: "lock", vehicle });
                                setMenuId(null);
                              }}
                              className="w-full rounded-lg px-3 py-2 text-left text-rose-700 hover:bg-rose-50"
                            >
                              Khóa xe
                            </button>
                          )
                        )}
                        {vehicle.status !== "INACTIVE" && (
                          <button
                            disabled={vehicle.status === "SWAP_PENDING"}
                            onClick={() => {
                              setAction({ kind: "deactivate", vehicle });
                              setMenuId(null);
                            }}
                            title={vehicle.status === "SWAP_PENDING" ? "Khi đang trong trạng thái thay pin thì không được tắt xe" : ""}
                            className="w-full rounded-lg px-3 py-2 text-left text-red-700 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Ngừng hoạt động
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 dark:border-slate-800">
            <div className="flex items-center gap-3 text-xs font-semibold text-slate-500">
              <span>{data.pagination.total.toLocaleString("vi-VN")} xe</span>
              <select
                value={filters.limit}
                onChange={(e) =>
                  setFilters((current) => ({
                    ...current,
                    limit: Number(
                      e.target.value,
                    ) as AdminVehicleFilters["limit"],
                    page: 1,
                  }))
                }
                className="rounded-lg border bg-white px-2 py-1.5 dark:bg-slate-800"
              >
                {[10, 20, 50, 100].map((limit) => (
                  <option key={limit} value={limit}>
                    {limit} / trang
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={filters.page <= 1}
                onClick={() =>
                  setFilters((current) => ({
                    ...current,
                    page: current.page - 1,
                  }))
                }
                className="rounded-lg border px-3 py-1.5 text-xs font-bold disabled:opacity-40"
              >
                Trước
              </button>
              <span className="text-xs font-bold">
                {filters.page} / {Math.max(data.pagination.totalPages, 1)}
              </span>
              <button
                disabled={filters.page >= data.pagination.totalPages}
                onClick={() =>
                  setFilters((current) => ({
                    ...current,
                    page: current.page + 1,
                  }))
                }
                className="rounded-lg border px-3 py-1.5 text-xs font-bold disabled:opacity-40"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>
      {action && (
        <VehicleActionModal
          open
          title={actionCopy[action.kind].title}
          description={actionCopy[action.kind].description}
          requireCategory={action.kind === "lock"}
          loading={actionLoading}
          onClose={() => setAction(null)}
          onConfirm={runAction}
        />
      )}
    </div>
  );
}
