import { useEffect, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Battery,
  Car,
  RefreshCw,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useAdminVehicleDetail } from "../../../../hooks/useAdminVehicleDetail";
import {
  getVehicleAuditLogs,
  getVehicleBatteryHealth,
  getVehicleIncidents,
  getVehicleMaintenanceHistory,
  getVehicleOwnershipHistory,
  getVehicleSwapHistory,
  getVehicleTransferRequests,
} from "../../../../services/adminVehicleApi";
import { getApiErrorMessage } from "../../../../services/apiClient";
import type {
  AdminAuditLog,
  VehicleSwapHistoryItem,
} from "../../../../types/adminVehicle";
import { VehicleStatusBadge } from "../../../../components/admin-vehicles/VehicleBadges";

type Tab =
  | "overview"
  | "battery"
  | "swaps"
  | "maintenance"
  | "ownership"
  | "transfer"
  | "audit";
const tabs: Array<{ id: Tab; label: string }> = [
  { id: "overview", label: "Tổng quan" },
  { id: "battery", label: "Pin và sức khỏe" },
  { id: "swaps", label: "Lịch sử đổi pin" },
  { id: "maintenance", label: "Bảo trì và sự cố" },
  { id: "ownership", label: "Quyền sở hữu" },
  { id: "transfer", label: "Yêu cầu chuyển quyền" },
  { id: "audit", label: "Nhật ký quản trị" },
];
const fieldLabels: Record<string, string> = {
  id: "Mã",
  code: "Mã hồ sơ",
  vehicleId: "Mã xe",
  userId: "Mã khách hàng",
  stationId: "Mã trạm",
  bookingId: "Mã lịch hẹn",
  staffId: "Mã nhân viên",
  technicianId: "Mã kỹ thuật viên",
  reporterId: "Mã người báo cáo",
  currentOwnerId: "Mã chủ sở hữu hiện tại",
  requestedOwnerId: "Mã chủ sở hữu mới",
  previousOwnerId: "Mã chủ sở hữu trước",
  newOwnerId: "Mã chủ sở hữu mới",
  transferRequestId: "Mã yêu cầu chuyển quyền",
  batteryId: "Mã pin",
  batteryInId: "Mã pin thu hồi",
  batteryOutId: "Mã pin thay thế",
  batteryInSoc: "SoC pin thu hồi",
  batteryOutSoc: "SoC pin thay thế",
  batteryCode: "Mã pin",
  serialNumber: "Số sê-ri",
  plateNumber: "Biển số",
  vinNumber: "Số VIN",
  qrCode: "Mã QR",
  type: "Loại",
  requestType: "Loại yêu cầu",
  maintenanceType: "Loại bảo trì",
  incidentType: "Loại sự cố",
  description: "Mô tả",
  reason: "Lý do",
  transferReason: "Lý do chuyển quyền",
  notes: "Ghi chú",
  adminNotes: "Ghi chú quản trị",
  rejectionReason: "Lý do từ chối",
  additionalInfoRequest: "Thông tin cần bổ sung",
  result: "Kết quả",
  safetyResult: "Kết quả an toàn",
  resolution: "Hướng xử lý",
  severity: "Mức độ",
  status: "Trạng thái",
  workflowStatus: "Tiến trình đổi pin",
  paymentStatus: "Trạng thái thanh toán",
  action: "Hành động",
  soh: "SoH",
  soc: "SoC",
  odo: "ODO",
  cycleCount: "Số chu kỳ",
  accumulatedMileageKm: "Quãng đường tích lũy",
  dataSource: "Nguồn dữ liệu",
  recordedBy: "Người ghi nhận",
  approvedBy: "Người phê duyệt",
  reviewedBy: "Người xét duyệt",
  transferredBy: "Người thực hiện chuyển quyền",
  createdAt: "Ngày tạo",
  updatedAt: "Ngày cập nhật",
  recordedAt: "Ngày ghi nhận",
  submittedAt: "Ngày gửi",
  reviewedAt: "Ngày xét duyệt",
  transferredAt: "Ngày chuyển quyền",
  startedAt: "Thời gian bắt đầu",
  completedAt: "Thời gian hoàn tất",
  expectedStartDate: "Ngày dự kiến bắt đầu",
  expectedCompletionDate: "Ngày dự kiến hoàn tất",
  registrationDocumentUrl: "Giấy đăng ký xe",
  identityDocumentUrl: "Giấy tờ tùy thân",
  purchaseContractUrl: "Hợp đồng mua bán",
  additionalDocumentUrls: "Tài liệu bổ sung",
};
const valueLabels: Record<string, string> = {
  ACTIVE: "Hoạt động",
  INACTIVE: "Ngừng hoạt động",
  LOCKED: "Bị khóa",
  NEEDS_INSPECTION: "Cần kiểm tra",
  UNSAFE: "Không an toàn",
  SWAP_PENDING: "Đang chờ đổi pin",
  MAINTENANCE: "Đang bảo trì",
  TRANSFER_PENDING: "Đang chuyển quyền",
  SAFE: "An toàn",
  WARNING: "Cần theo dõi",
  UNKNOWN: "Chưa xác định",
  HEALTHY: "Tốt",
  LIMITED: "Hạn chế",
  NEEDS_MAINTENANCE: "Cần bảo trì",
  REPLACEMENT_REQUIRED: "Cần thay thế",
  GOOD: "Tốt",
  MONITOR: "Cần theo dõi",
  REPLACE_SOON: "Sớm cần thay thế",
  AVAILABLE: "Sẵn sàng",
  RESERVED: "Đã giữ chỗ",
  INSTALLED: "Đã lắp đặt",
  REMOVED: "Đã tháo",
  INSPECTION_REQUIRED: "Cần kiểm tra",
  RETIRED: "Đã ngừng sử dụng",
  QUARANTINED: "Đang cách ly",
  READY: "Sẵn sàng",
  CHARGING: "Đang sạc",
  FAULTY: "Bị lỗi",
  DRAFT: "Bản nháp",
  PENDING: "Đang chờ xử lý",
  UNDER_REVIEW: "Đang kiểm tra",
  NEED_MORE_INFORMATION: "Cần bổ sung thông tin",
  APPROVED: "Đã phê duyệt",
  REJECTED: "Bị từ chối",
  CANCELLED: "Đã hủy",
  SCHEDULED: "Đã lên lịch",
  IN_PROGRESS: "Đang thực hiện",
  COMPLETED: "Đã hoàn tất",
  OPEN: "Đang mở",
  INVESTIGATING: "Đang điều tra",
  RESOLVED: "Đã xử lý",
  CLOSED: "Đã đóng",
  LOW: "Thấp",
  MEDIUM: "Trung bình",
  HIGH: "Cao",
  CRITICAL: "Nghiêm trọng",
  SUCCESS: "Thành công",
  FAILED: "Thất bại",
  PROCESSING: "Đang xử lý",
  REFUNDED: "Đã hoàn tiền",
  PAID: "Đã thanh toán",
  UNPAID: "Chưa thanh toán",
  WALLET: "Ví hệ thống",
  VNPAY: "VNPay",
  CASH: "Tiền mặt",
  NOT_STARTED: "Chưa bắt đầu",
  VERIFIED: "Đã xác minh",
  OLD_BATTERY_REMOVED: "Đã tháo pin cũ",
  OLD_BATTERY_INSPECTED: "Đã kiểm tra pin cũ",
  REPLACEMENT_ASSIGNED: "Đã chỉ định pin thay thế",
  PAYMENT_PENDING: "Đang chờ thanh toán",
  ROLLED_BACK: "Đã hoàn tác",
  USED_VEHICLE_PURCHASE: "Mua xe đã qua sử dụng",
  LOST_OLD_ACCOUNT: "Mất tài khoản cũ",
  CHANGED_PHONE_NUMBER: "Thay đổi số điện thoại",
  OTHER: "Khác",
  MANUAL_INSPECTION: "Kiểm tra thủ công",
  SIMULATED_DIAGNOSTIC: "Chẩn đoán mô phỏng",
  AGE_BASED_ESTIMATION: "Ước tính theo tuổi pin",
  LIFECYCLE_SIMULATION: "Mô phỏng vòng đời",
};
const auditActionLabels: Record<string, string> = {
  VEHICLE_CREATED: "Tạo xe",
  VEHICLE_UPDATED: "Cập nhật xe",
  VEHICLE_LOCKED: "Khóa xe",
  VEHICLE_UNLOCKED: "Mở khóa xe",
  VEHICLE_MARKED_NEEDS_INSPECTION: "Đánh dấu cần kiểm tra",
  VEHICLE_MARKED_MAINTENANCE: "Chuyển sang bảo trì",
  VEHICLE_DEACTIVATED: "Ngừng hoạt động xe",
  VEHICLE_STATUS_CHANGED: "Thay đổi trạng thái xe",
  VEHICLE_IDENTIFIER_CORRECTION_REQUESTED: "Yêu cầu sửa định danh xe",
  VEHICLE_OWNER_CHANGED: "Thay đổi chủ sở hữu",
  VEHICLE_TRANSFER_APPROVED: "Phê duyệt chuyển quyền",
  VEHICLE_TRANSFER_REJECTED: "Từ chối chuyển quyền",
  VEHICLE_ACTIVE: "Chuyển sang hoạt động",
  VEHICLE_NEEDS_INSPECTION: "Đánh dấu cần kiểm tra",
  VEHICLE_UNSAFE: "Đánh dấu không an toàn",
  VEHICLE_MAINTENANCE: "Chuyển sang bảo trì",
  VEHICLE_INACTIVE: "Ngừng hoạt động xe",
};
const labelForField = (key: string) =>
  fieldLabels[key] ??
  key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/^./, (character) => character.toUpperCase());
const localizedValue = (value: unknown) =>
  typeof value === "string"
    ? (auditActionLabels[value] ?? valueLabels[value] ?? value)
    : value;
const formatDateTime = (value: unknown) =>
  typeof value === "string"
    ? new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(value))
    : "—";
const display = (value: unknown): ReactNode => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Có" : "Không";
  if (typeof value === "string" || typeof value === "number")
    return String(value);
  return JSON.stringify(value);
};
const isUrl = (value: string) => /^https?:\/\//i.test(value);
const identifierKey = (key: string) =>
  /(^id$|code|serial|vin|qr|plateNumber|warrantyNumber)/i.test(key);
const identifierFromValue = (value: unknown) => {
  if (typeof value !== "string") return display(value);
  if (!isUrl(value)) return value;

  try {
    const url = new URL(value);
    const queryCode = ["code", "qrCode", "qr", "serialNumber", "vin", "id"]
      .map((key) => url.searchParams.get(key))
      .find(Boolean);
    if (queryCode) return queryCode;

    const lastPathPart = url.pathname.split("/").filter(Boolean).at(-1);
    return lastPathPart ? decodeURIComponent(lastPathPart) : url.hostname;
  } catch {
    return value;
  }
};
const IdentifierCode = ({
  value,
  fallback,
}: {
  value: unknown;
  fallback?: unknown;
}) => {
  const identifier = identifierFromValue(value);
  const genericUrlParts = ["vehicle", "vehicles", "lookup", "detail"];
  const visibleIdentifier =
    fallback !== undefined &&
    (value === null ||
      value === undefined ||
      value === "" ||
      (typeof identifier === "string" &&
        genericUrlParts.includes(identifier.toLowerCase())))
      ? identifierFromValue(fallback)
      : identifier;

  return (
    <code className="inline-flex max-w-full break-all rounded-md border border-slate-200 bg-white px-2 py-1 font-mono text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
      {visibleIdentifier}
    </code>
  );
};
const actualIdentifier = (value: unknown) => {
  const identifier = identifierFromValue(value);
  if (typeof identifier !== "string") return null;
  if (
    ["vehicle", "vehicles", "lookup", "detail", "—"].includes(
      identifier.toLowerCase(),
    )
  )
    return null;
  return identifier;
};
const numberValue = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;
const BatteryCurrentPanel = ({
  battery,
  vehicleBatteryType,
  vehicleStatus,
}: {
  battery: Record<string, unknown>;
  vehicleBatteryType: string;
  vehicleStatus: string;
}) => {
  const batteryCode = actualIdentifier(battery.batteryCode);
  const qrCode = actualIdentifier(battery.qrCodeValue);
  const serialNumber = actualIdentifier(battery.serialNumber);
  const estimatedSoh =
    numberValue(battery.estimatedSoH) ?? numberValue(battery.soh);
  const classification =
    typeof battery.healthClassification === "string"
      ? battery.healthClassification
      : "UNKNOWN";
  const safetyState =
    typeof battery.safetyState === "string" ? battery.safetyState : "UNKNOWN";
  const requiresReplacement =
    (estimatedSoh !== null && estimatedSoh < 70) ||
    classification === "REPLACEMENT_REQUIRED" ||
    classification === "UNSAFE" ||
    safetyState === "UNSAFE";
  const requiresInspection =
    !requiresReplacement &&
    ["NEEDS_MAINTENANCE", "LIMITED", "WARNING"].includes(classification);
  const batteryType =
    (typeof battery.type === "string" && battery.type) || vehicleBatteryType;
  const lastInspection =
    typeof battery.lastHealthCheckAt === "string"
      ? battery.lastHealthCheckAt
      : null;
  const repairStatus =
    vehicleStatus === "MAINTENANCE"
      ? "Đang bảo trì"
      : vehicleStatus === "NEEDS_INSPECTION"
        ? "Đang chờ kiểm tra"
        : vehicleStatus === "SWAP_PENDING"
          ? "Đang thay pin"
          : "Không";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Battery className="h-5 w-5 text-emerald-500" />
        <h3 className="text-lg font-black">Pin hiện tại</h3>
      </div>

      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800 sm:grid-cols-2">
        <div>
          <p className="mb-1 text-xs font-semibold text-slate-500">Mã pin</p>
          {batteryCode ? (
            <IdentifierCode value={batteryCode} />
          ) : (
            <p className="text-sm font-semibold text-slate-400">
              Chưa có mã pin
            </p>
          )}
        </div>
        <div className="sm:text-right">
          <p className="mb-1 text-xs font-semibold text-slate-500">
            Sức khỏe dự đoán
          </p>
          <p className="text-xl font-black text-emerald-600">
            {estimatedSoh === null ? "Chưa có" : `${estimatedSoh.toFixed(2)}%`}
          </p>
        </div>
        {qrCode && qrCode !== batteryCode && (
          <div>
            <p className="mb-1 text-xs font-semibold text-slate-500">
              Mã QR pin
            </p>
            <IdentifierCode value={qrCode} />
          </div>
        )}
        {serialNumber && (
          <div className="sm:text-right">
            <p className="mb-1 text-xs font-semibold text-slate-500">
              Số sê-ri
            </p>
            <IdentifierCode value={serialNumber} />
          </div>
        )}
      </div>

      {(requiresReplacement || requiresInspection) && (
        <div
          className={`flex gap-3 rounded-xl border p-3 text-sm ${
            requiresReplacement
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-amber-200 bg-amber-50 text-amber-700"
          }`}
        >
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p>
            <strong>Cảnh báo:</strong> Tình trạng pin đang{" "}
            {display(localizedValue(classification))}. Vui lòng đổi pin sớm nhất
            có thể.
          </p>
        </div>
      )}

      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        <div className="flex justify-between gap-4 py-3">
          <span className="text-slate-500">Loại pin</span>
          <span className="font-semibold">{batteryType || "Chưa có"}</span>
        </div>
        <div className="flex justify-between gap-4 py-3">
          <span className="text-slate-500">Trạng thái</span>
          <span
            className={`font-semibold ${
              requiresReplacement
                ? "text-red-600"
                : requiresInspection
                  ? "text-amber-600"
                  : "text-emerald-600"
            }`}
          >
            {requiresReplacement
              ? "Yêu cầu thay"
              : requiresInspection
                ? "Cần kiểm tra"
                : "An toàn"}
          </span>
        </div>
        <div className="flex justify-between gap-4 py-3">
          <span className="text-slate-500">Trạng thái sửa chữa</span>
          <span className="font-semibold">{repairStatus}</span>
        </div>
        <div className="flex justify-between gap-4 py-3">
          <span className="text-slate-500">Lần kiểm tra cuối</span>
          <span className="font-semibold">
            {lastInspection ? formatDateTime(lastInspection) : "Không có"}
          </span>
        </div>
      </div>
    </div>
  );
};
const tableValue = (key: string, value: unknown): ReactNode => {
  if (/(At|Date)$/.test(key)) return formatDateTime(value);
  if (identifierKey(key)) return <IdentifierCode value={value} />;
  if (typeof value === "string" && isUrl(value)) {
    return (
      <a
        href={value}
        target="_blank"
        rel="noreferrer"
        className="font-semibold text-emerald-600 hover:underline"
      >
        Xem tài liệu
      </a>
    );
  }
  if (typeof value === "object" && value !== null) {
    const record = value as Record<string, unknown>;
    const nestedIdentifier =
      record.batteryCode ?? record.serialNumber ?? record.code ?? record.id;
    if (nestedIdentifier !== undefined)
      return <IdentifierCode value={nestedIdentifier} />;
  }
  return display(localizedValue(value));
};
const Info = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60">
    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
      {label}
    </p>
    <div className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-100">
      {children || "—"}
    </div>
  </div>
);
const DataTable = ({
  rows,
  empty,
  onRowClick,
}: {
  rows: unknown[];
  empty: string;
  onRowClick?: (row: Record<string, unknown>) => void;
}) => {
  const records = rows.filter(
    (row): row is Record<string, unknown> =>
      typeof row === "object" && row !== null,
  );
  const keys = records[0]
    ? Object.keys(records[0])
        .filter((key) => !["updatedAt", "vehicleId"].includes(key))
        .slice(0, 8)
    : [];
  if (!records.length)
    return (
      <div className="py-14 text-center text-sm font-semibold text-slate-400">
        {empty}
      </div>
    );
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px]">
        <thead>
          <tr className="border-b bg-slate-50 dark:border-slate-800 dark:bg-slate-800/60">
            {keys.map((key) => (
              <th
                key={key}
                className="px-4 py-3 text-left text-xs font-extrabold uppercase text-slate-500"
              >
                {labelForField(key)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y dark:divide-slate-800">
          {records.map((row, index) => (
            <tr
              key={String(row.id ?? index)}
              onClick={() => onRowClick?.(row)}
              className={
                onRowClick
                  ? "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  : undefined
              }
            >
              {keys.map((key) => (
                <td
                  key={key}
                  className="max-w-xs truncate px-4 py-3 text-sm text-slate-600 dark:text-slate-300"
                >
                  {tableValue(key, row[key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
const VehicleSwapHistoryTable = ({ rows }: { rows: VehicleSwapHistoryItem[] }) => {
  if (!rows.length)
    return (
      <div className="py-14 text-center text-sm font-semibold text-slate-400">
        Xe chưa có giao dịch đổi pin.
      </div>
    );
  const sohClass = (value?: number) =>
    value === undefined
      ? "text-slate-400"
      : value < 70
        ? "text-red-600"
        : value < 80
          ? "text-amber-600"
          : "text-emerald-600";
  const shortVin = (vin?: string) =>
    !vin
      ? "—"
      : vin.length > 16
        ? `${vin.slice(0, 11)}...${vin.slice(-4)}`
        : vin;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1250px]">
        <thead>
          <tr className="border-b bg-slate-50 dark:border-slate-800 dark:bg-slate-800/60">
            {[
              "Mã giao dịch",
              "Xe",
              "Trạm",
              "Pin cũ → Pin mới",
              "SoH cũ → mới",
              "ODO",
              "Thanh toán",
              "Trạng thái",
              "Thời gian",
            ].map((head) => (
              <th
                key={head}
                className="px-4 py-3 text-left text-xs font-extrabold uppercase text-slate-500"
              >
                {head}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y dark:divide-slate-800">
          {rows.map((row) => (
            <tr
              key={row.id}
              className="hover:bg-slate-50 dark:hover:bg-slate-800/50"
            >
              <td className="px-4 py-3">
                <span className="font-mono text-xs font-black text-emerald-600">
                  {row.code}
                </span>
                {row.bookingId && (
                  <p className="mt-1 font-mono text-[11px] text-slate-400">
                    Booking: {row.bookingId}
                  </p>
                )}
              </td>
              <td className="px-4 py-3">
                <p className="text-sm font-bold">
                  {row.vehicle.plateNumber ?? "—"}
                </p>
                <p className="text-xs text-slate-500">
                  {row.vehicle.model ?? "—"} · {shortVin(row.vehicle.vinNumber)}
                </p>
                <p className="text-xs text-slate-400">
                  {row.vehicle.ownerName ?? "Chưa có snapshot chủ xe"}
                </p>
              </td>
              <td className="px-4 py-3">
                <p className="text-sm font-semibold">{row.station.name}</p>
                <p className="font-mono text-xs text-slate-400">
                  {row.station.code}
                </p>
              </td>
              <td className="px-4 py-3 font-mono text-xs font-bold">
                {row.oldBattery?.code ?? "—"}{" "}
                <span className="px-1 text-slate-400">→</span>{" "}
                {row.newBattery?.code ?? "—"}
              </td>
              <td className="px-4 py-3">
                <p className="text-sm font-black">
                  <span className={sohClass(row.oldBattery?.soh)}>
                    {row.oldBattery?.soh === undefined
                      ? "—"
                      : `${Number(row.oldBattery.soh).toFixed(1)}%`}
                  </span>{" "}
                  <span className="px-1 text-slate-400">→</span>{" "}
                  <span className={sohClass(row.newBattery?.soh)}>
                    {row.newBattery?.soh === undefined
                      ? "—"
                      : `${Number(row.newBattery.soh).toFixed(1)}%`}
                  </span>
                </p>
                <p className="text-xs text-slate-400">
                  SoC {row.oldBattery?.soc ?? "—"}% →{" "}
                  {row.newBattery?.soc ?? "—"}%
                </p>
              </td>
              <td className="px-4 py-3 text-sm font-semibold">
                {row.vehicle.odo === undefined
                  ? "—"
                  : `${Number(row.vehicle.odo).toLocaleString("vi-VN")} km`}
              </td>
              <td className="px-4 py-3">
                {row.payment ? (
                  <>
                    <p className="text-sm font-bold">
                      {row.payment.amount.toLocaleString("vi-VN")}₫
                    </p>
                    <p className="text-xs text-slate-500">
                      {display(localizedValue(row.payment.method))}
                    </p>
                    <p className="text-xs font-semibold text-emerald-600">
                      {display(localizedValue(row.payment.status))}
                    </p>
                  </>
                ) : (
                  <span className="text-sm text-slate-400">Chưa có</span>
                )}
              </td>
              <td className="px-4 py-3 text-sm font-bold">
                {display(localizedValue(row.status))}
              </td>
              <td className="px-4 py-3 text-xs">
                {formatDateTime(
                  row.completedAt ?? row.startedAt ?? row.createdAt,
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default function AdminVehicleDetail() {
  const { vehicleId = "" } = useParams();
  const navigate = useNavigate();
  const { data, loading, error, refresh } = useAdminVehicleDetail(vehicleId);
  const [tab, setTab] = useState<Tab>("overview");
  const [tabData, setTabData] = useState<unknown>(null);
  const [tabLoading, setTabLoading] = useState(false);
  const [tabError, setTabError] = useState<string | null>(null);
  useEffect(() => {
    if (tab === "overview") return;
    let active = true;
    setTabLoading(true);
    setTabError(null);
    const loaders: Record<Exclude<Tab, "overview">, () => Promise<unknown>> = {
      battery: () => getVehicleBatteryHealth(vehicleId),
      swaps: () => getVehicleSwapHistory(vehicleId),
      maintenance: async () => ({
        maintenance: await getVehicleMaintenanceHistory(vehicleId),
        incidents: await getVehicleIncidents(vehicleId),
      }),
      ownership: () => getVehicleOwnershipHistory(vehicleId),
      transfer: () => getVehicleTransferRequests(vehicleId),
      audit: () => getVehicleAuditLogs(vehicleId),
    };
    void loaders[tab]()
      .then((result) => {
        if (active) setTabData(result);
      })
      .catch((cause) => {
        if (active) setTabError(getApiErrorMessage(cause));
      })
      .finally(() => {
        if (active) setTabLoading(false);
      });
    return () => {
      active = false;
    };
  }, [tab, vehicleId]);
  if (loading && !data)
    return (
      <div className="grid min-h-64 place-items-center">
        <RefreshCw className="h-7 w-7 animate-spin text-emerald-600" />
      </div>
    );
  if (error || !data)
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
        <p className="font-bold">Không thể tải thông tin xe</p>
        <p className="mt-1 text-sm">{error}</p>
        <button
          onClick={() => navigate("/admin/vehicles")}
          className="mt-4 text-sm font-bold underline"
        >
          Quay lại danh sách
        </button>
      </div>
    );
  const rows = Array.isArray(tabData) ? tabData : [];
  const maintenanceData =
    typeof tabData === "object" && tabData !== null
      ? (tabData as { maintenance?: unknown[]; incidents?: unknown[] })
      : {};
  const battery =
    typeof tabData === "object" && tabData !== null
      ? (tabData as Record<string, unknown>)
      : null;
  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate("/admin/vehicles")}
        className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-emerald-600"
      >
        <ArrowLeft className="h-4 w-4" /> Quay lại danh sách xe
      </button>
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
            <Car className="h-7 w-7" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-black text-slate-900 dark:text-white">
                {data.plateNumber}
              </h1>
              <VehicleStatusBadge status={data.status} />
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {data.model || data.name} · {data.owner.fullName}
            </p>
          </div>
        </div>
        <button
          onClick={() => void refresh()}
          aria-label="Làm mới"
          className="grid h-10 w-10 place-items-center rounded-xl border"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>
      <div className="overflow-x-auto rounded-2xl border bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="flex min-w-max border-b px-3 dark:border-slate-800">
          {tabs.map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`border-b-2 px-4 py-4 text-sm font-bold ${tab === item.id ? "border-emerald-500 text-emerald-600" : "border-transparent text-slate-500"}`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="p-5">
          {tabLoading ? (
            <div className="grid min-h-48 place-items-center">
              <RefreshCw className="h-6 w-6 animate-spin text-emerald-600" />
            </div>
          ) : tabError ? (
            <p className="rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">
              {tabError}
            </p>
          ) : (
            <>
              {tab === "overview" && (
                <div>
                  <h2 className="mb-4 text-lg font-black">Thông tin xe</h2>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Info label="Biển số">
                      <IdentifierCode value={data.plateNumber} />
                    </Info>
                    <Info label="VIN đầy đủ">
                      <IdentifierCode value={data.vinNumber} />
                    </Info>
                    <Info label="Mã QR">
                      <IdentifierCode value={data.qrCode} fallback={data.id} />
                    </Info>
                    <Info label="Mẫu xe">{data.model}</Info>
                    <Info label="Hãng sản xuất">{data.brand}</Info>
                    <Info label="Năm sản xuất">{data.manufactureYear}</Info>
                    <Info label="Màu sắc">{data.color}</Info>
                    <Info label="Loại pin">{data.batteryType}</Info>
                    <Info label="ODO">
                      {(data.currentMileageKm ?? 0).toLocaleString("vi-VN")} km
                    </Info>
                    <Info label="Chủ sở hữu">
                      {data.owner.fullName}
                      <p className="text-xs font-medium text-slate-500">
                        {data.owner.email} · {data.owner.phone}
                      </p>
                    </Info>
                    <Info label="Bắt đầu sở hữu">
                      {formatDateTime(data.ownershipStartDate)}
                    </Info>
                    <Info label="Ngày tạo">
                      {formatDateTime(data.createdAt)}
                    </Info>
                    <Info label="Cập nhật">
                      {formatDateTime(data.updatedAt)}
                    </Info>
                    <Info label="Lần đổi pin gần nhất">
                      {data.lastSwap
                        ? formatDateTime(data.lastSwap.createdAt)
                        : "Chưa có"}
                    </Info>
                  </div>
                </div>
              )}
              {tab === "battery" && (
                <div>
                  {battery ? (
                    <>
                      <BatteryCurrentPanel
                        battery={battery}
                        vehicleBatteryType={data.batteryType}
                        vehicleStatus={data.status}
                      />
                      <h3 className="mb-3 mt-6 font-black">
                        Nhật ký sức khỏe pin
                      </h3>
                      <DataTable
                        rows={
                          Array.isArray(battery.healthLogs)
                            ? battery.healthLogs
                            : []
                        }
                        empty="Chưa có nhật ký sức khỏe pin."
                      />
                    </>
                  ) : (
                    <p className="py-12 text-center text-slate-400">
                      Xe chưa có pin hiện tại.
                    </p>
                  )}
                </div>
              )}
              {tab === "swaps" && (
                <VehicleSwapHistoryTable
                  rows={rows as VehicleSwapHistoryItem[]}
                />
              )}
              {tab === "maintenance" && (
                <div className="space-y-8">
                  <section>
                    <h3 className="mb-3 font-black">Hồ sơ bảo trì</h3>
                    <DataTable
                      rows={maintenanceData.maintenance ?? []}
                      empty="Chưa có hồ sơ bảo trì."
                    />
                  </section>
                  <section>
                    <h3 className="mb-3 font-black">Sự cố xe</h3>
                    <DataTable
                      rows={maintenanceData.incidents ?? []}
                      empty="Chưa ghi nhận sự cố."
                    />
                  </section>
                </div>
              )}
              {tab === "ownership" && (
                <div>
                  <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Info label="Chủ sở hữu hiện tại">
                      {data.owner.fullName}
                    </Info>
                    <Info label="Email">{data.owner.email}</Info>
                    <Info label="Điện thoại">{data.owner.phone}</Info>
                    <Info label="Trạng thái tài khoản">
                      {display(localizedValue(data.owner.status))}
                    </Info>
                  </div>
                  <h3 className="mb-3 font-black">Lịch sử quyền sở hữu</h3>
                  <DataTable
                    rows={rows}
                    empty="Chưa có lịch sử chuyển quyền sở hữu."
                  />
                </div>
              )}
              {tab === "transfer" &&
                (rows.length ? (
                  <>
                    <DataTable rows={rows} empty="" />
                    {data.transfer && (
                      <button
                        onClick={() =>
                          navigate(
                            `/admin/vehicle-transfers/${data.transfer?.id}`,
                          )
                        }
                        className="mt-4 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white"
                      >
                        Xem chi tiết yêu cầu
                      </button>
                    )}
                  </>
                ) : (
                  <p className="py-14 text-center text-sm font-semibold text-slate-400">
                    Xe hiện không có yêu cầu chuyển quyền đang xử lý.
                  </p>
                ))}
              {tab === "audit" && (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px]">
                    <thead>
                      <tr className="border-b bg-slate-50 dark:border-slate-800 dark:bg-slate-800/60">
                        {[
                          "Thời gian",
                          "Người thực hiện",
                          "Hành động",
                          "Lý do",
                          "IP",
                          "User agent",
                        ].map((head) => (
                          <th
                            key={head}
                            className="px-4 py-3 text-left text-xs font-extrabold uppercase text-slate-500"
                          >
                            {head}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y dark:divide-slate-800">
                      {(rows as AdminAuditLog[]).map((log) => (
                        <tr key={log.id}>
                          <td className="px-4 py-3 text-sm">
                            {formatDateTime(log.createdAt)}
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold">
                            {log.admin?.fullName ?? "Hệ thống"}
                          </td>
                          <td className="px-4 py-3 text-xs font-bold">
                            {auditActionLabels[log.action] ?? log.action}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {log.details ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-xs">
                            {log.ipAddress ?? "—"}
                          </td>
                          <td className="max-w-xs truncate px-4 py-3 text-xs">
                            {log.userAgent ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!rows.length && (
                    <p className="py-14 text-center text-sm text-slate-400">
                      Chưa có nhật ký quản trị cho xe này.
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
