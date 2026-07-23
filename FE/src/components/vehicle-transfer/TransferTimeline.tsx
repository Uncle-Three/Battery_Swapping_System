import type { VehicleTransferRequest } from "../../types/vehicle-transfer";
import { TransferStatusBadge } from "./TransferStatusBadge";
import { formatDate } from "../../utils/format";

interface TransferTimelineProps {
  request: VehicleTransferRequest;
}

type TimelineEvent = {
  label: string;
  date?: string;
  status: VehicleTransferRequest["status"];
  active: boolean;
  description?: string;
};

export function TransferTimeline({ request }: TransferTimelineProps) {
  const isFinalNegative = request.status === "REJECTED" || request.status === "CANCELLED";
  const needsInfo = request.status === "NEED_MORE_INFORMATION";

  const events: TimelineEvent[] = [
    {
      label: "Tạo yêu cầu",
      status: "DRAFT",
      active: true,
      date: request.createdAt,
      description: "Yêu cầu đã tạo dưới dạng bản nháp",
    },
    {
      label: "Gửi hồ sơ xét duyệt",
      status: "PENDING",
      active: ["PENDING", "UNDER_REVIEW", "NEED_MORE_INFORMATION", "APPROVED", "REJECTED"].includes(request.status),
      date: request.submittedAt,
      description: "Hồ sơ đã gửi cho Quản trị viên kiểm tra",
    },
    {
      label: "Đang xét duyệt",
      status: "UNDER_REVIEW",
      active: ["UNDER_REVIEW", "NEED_MORE_INFORMATION", "APPROVED", "REJECTED"].includes(request.status),
      description: "Hệ thống đang tiến hành đối soát thông tin xe",
    },
    ...(needsInfo
      ? [{
          label: "Yêu cầu bổ sung thông tin",
          status: "NEED_MORE_INFORMATION" as const,
          active: true,
          description: request.additionalInfoRequest ?? "Quản trị viên yêu cầu cập nhật thêm chứng từ",
        }]
      : []),
    {
      label: isFinalNegative
        ? request.status === "REJECTED" ? "Yêu cầu bị từ chối" : "Đã hủy yêu cầu"
        : "Đã duyệt chuyển quyền",
      status: isFinalNegative ? request.status : "APPROVED",
      active: isFinalNegative || request.status === "APPROVED",
      date: request.reviewedAt,
      description: request.status === "REJECTED"
        ? (request.rejectionReason ?? "Yêu cầu không được chấp nhận")
        : request.status === "CANCELLED"
        ? "Yêu cầu đã hủy"
        : "Quyền sở hữu xe đã cập nhật thành công",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tiến trình xử lý</h3>
        <TransferStatusBadge status={request.status} size="sm" />
      </div>

      <div className="relative pl-6">
        <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-slate-200 dark:bg-slate-800" />

        <div className="space-y-6">
          {events.map((event, idx) => (
            <div key={idx} className="relative flex gap-4">
              {/* Dot */}
              <div
                className={`absolute -left-6 flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all ${
                  event.active
                    ? event.status === "REJECTED" || event.status === "CANCELLED"
                      ? "border-red-500 bg-red-100 dark:bg-red-950/40"
                      : event.status === "NEED_MORE_INFORMATION"
                      ? "border-orange-500 bg-orange-100 dark:bg-orange-950/40"
                      : event.status === "APPROVED"
                      ? "border-emerald-500 bg-emerald-100 dark:bg-emerald-950/40"
                      : "border-blue-500 bg-blue-100 dark:bg-blue-950/40"
                    : "border-slate-300 bg-slate-100 dark:border-slate-800 dark:bg-slate-900"
                }`}
              >
                {event.active && (
                  <div
                    className={`h-2 w-2 rounded-full ${
                      event.status === "REJECTED" || event.status === "CANCELLED"
                        ? "bg-red-500"
                        : event.status === "NEED_MORE_INFORMATION"
                        ? "bg-orange-500"
                        : event.status === "APPROVED"
                        ? "bg-emerald-500"
                        : "bg-blue-500"
                    }`}
                  />
                )}
              </div>

              {/* Content */}
              <div className={`flex-1 pb-1 ${!event.active ? "opacity-40" : ""}`}>
                <p className="text-sm font-bold text-slate-900 dark:text-white">{event.label}</p>
                {event.date && (
                  <p className="text-xs font-semibold text-slate-400 mt-0.5">{formatDate(event.date)}</p>
                )}
                {event.description && event.active && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{event.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Admin notes */}
      {request.adminNotes && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-1 dark:border-slate-800 dark:bg-slate-900/60">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ghi chú từ quản trị viên</p>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{request.adminNotes}</p>
        </div>
      )}
    </div>
  );
}
