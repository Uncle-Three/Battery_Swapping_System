import type { AdminVehicleStatus, BatterySafetyStatus, TransferStatus } from '../../types/adminVehicle';

const vehicleLabels: Record<AdminVehicleStatus, string> = { ACTIVE: 'Hoạt động', NEEDS_INSPECTION: 'Cần kiểm tra', UNSAFE: 'Pin không an toàn', SWAP_PENDING: 'Đang chờ đổi pin', MAINTENANCE: 'Đang bảo trì', TRANSFER_PENDING: 'Đang chuyển quyền', LOCKED: 'Bị khóa', INACTIVE: 'Ngừng hoạt động' };
const vehicleColors: Record<AdminVehicleStatus, string> = { ACTIVE: 'bg-emerald-100 text-emerald-700', NEEDS_INSPECTION: 'bg-amber-100 text-amber-700', UNSAFE: 'bg-red-100 text-red-700', SWAP_PENDING: 'bg-blue-100 text-blue-700', MAINTENANCE: 'bg-violet-100 text-violet-700', TRANSFER_PENDING: 'bg-cyan-100 text-cyan-700', LOCKED: 'bg-rose-100 text-rose-700', INACTIVE: 'bg-slate-100 text-slate-600' };
export const VehicleStatusBadge = ({ status }: { status: AdminVehicleStatus }) => <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${vehicleColors[status]}`}>{vehicleLabels[status]}</span>;

const batteryLabels: Record<BatterySafetyStatus, string> = { SAFE: 'Tốt', WARNING: 'Cần theo dõi', UNSAFE: 'Không an toàn', NO_DATA: 'Chưa có dữ liệu' };
const batteryColors: Record<BatterySafetyStatus, string> = { SAFE: 'text-emerald-700', WARNING: 'text-amber-700', UNSAFE: 'text-red-700', NO_DATA: 'text-slate-500' };
export const BatteryHealthBadge = ({ status, soh }: { status: BatterySafetyStatus; soh?: number }) => <span className={`text-sm font-bold ${batteryColors[status]}`}>{soh === undefined ? '' : `SoH ${Math.round(soh)}% · `}{batteryLabels[status]}</span>;

const transferLabels: Record<string, string> = { NONE: 'Không có yêu cầu', DRAFT: 'Bản nháp', PENDING: 'Đang chờ duyệt', UNDER_REVIEW: 'Đang kiểm tra', NEED_MORE_INFORMATION: 'Cần bổ sung giấy tờ', APPROVED: 'Đã duyệt', REJECTED: 'Bị từ chối', CANCELLED: 'Đã hủy' };
export const TransferStatusBadge = ({ status }: { status: TransferStatus | 'DRAFT' | 'CANCELLED' }) => <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{transferLabels[status]}</span>;
