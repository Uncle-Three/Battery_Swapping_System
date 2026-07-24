import type { VehicleTransferRequestStatus } from "../../types/vehicle-transfer";

const STATUS_CONFIG: Record<
  VehicleTransferRequestStatus,
  { label: string; classes: string }
> = {
  DRAFT: { label: "Bản nháp", classes: "bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700" },
  PENDING: { label: "Chờ xử lý", classes: "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800" },
  UNDER_REVIEW: { label: "Đang xem xét", classes: "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800" },
  NEED_MORE_INFORMATION: { label: "Cần bổ sung thông tin", classes: "bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800" },
  APPROVED: { label: "Đã phê duyệt", classes: "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800" },
  REJECTED: { label: "Từ chối", classes: "bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800" },
  CANCELLED: { label: "Đã hủy", classes: "bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-800" },
};

interface TransferStatusBadgeProps {
  status: VehicleTransferRequestStatus;
  size?: "sm" | "md";
}

export function TransferStatusBadge({ status, size = "md" }: TransferStatusBadgeProps) {
  const config = STATUS_CONFIG[status] || { label: status, classes: "bg-slate-100 text-slate-700" };
  const sizeClass = size === "sm" ? "px-2.5 py-0.5 text-xs font-semibold" : "px-3 py-1 text-sm font-bold";
  return (
    <span className={`inline-flex items-center rounded-full ${sizeClass} ${config.classes}`}>
      {config.label}
    </span>
  );
}
