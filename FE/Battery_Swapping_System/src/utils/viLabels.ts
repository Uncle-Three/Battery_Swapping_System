const labels: Record<string, string> = {
  ACTIVE: 'Hoạt động', INACTIVE: 'Ngừng hoạt động', BLOCKED: 'Đã khóa', DRAFT: 'Bản nháp',
  AVAILABLE: 'Sẵn sàng', IN_USE: 'Đang sử dụng', MAINTENANCE: 'Bảo trì', READY: 'Sẵn sàng', CHARGING: 'Đang sạc', FAULTY: 'Hư hỏng',
  FULL: 'Đã đầy', TEMPORARILY_RESERVED: 'Tạm giữ', CANCELLED: 'Đã hủy', COMPLETED: 'Hoàn tất', RESERVED: 'Đã giữ chỗ',
  INSTALLED: 'Đã lắp trên xe', INSPECTION_REQUIRED: 'Cần kiểm tra', QUARANTINED: 'Đang cách ly', RETIRED: 'Ngừng sử dụng', REMOVED: 'Đã tháo khỏi xe',
  SAFE: 'An toàn', WARNING: 'Cảnh báo', UNSAFE: 'Không an toàn', UNKNOWN: 'Chưa xác định', REPLACEMENT_REQUIRED: 'Cần thay thế', HEALTHY: 'Tốt (Đạt tiêu chuẩn)', LIMITED: 'Giới hạn',
  CREATED: 'Đã tạo', PENDING_APPROVAL: 'Chờ phê duyệt', APPROVED: 'Đã phê duyệt', CONFIRMED: 'Đã xác nhận', REJECTED: 'Đã từ chối',
  CHECKED_IN: 'Đã tiếp nhận', CHECK_IN: 'Xác minh khách đã đến trạm', PAYMENT_PENDING: 'Chờ thanh toán', PENDING: 'Đang chờ', PAID: 'Đã thanh toán', UNPAID: 'Chưa thanh toán', EXPIRED: 'Đã hết hạn', RESCHEDULED: 'Đề xuất đổi lịch',
  OPEN: 'Mới mở', IN_PROGRESS: 'Đang xử lý', RESOLVED: 'Đã xử lý',
  LOW: 'Thấp', MEDIUM: 'Trung bình', HIGH: 'Cao', CRITICAL: 'Nghiêm trọng',
  STATION_MAINTENANCE: 'Bảo trì trạm', BAY_MAINTENANCE: 'Bảo trì khoang', BATTERY_MAINTENANCE: 'Bảo trì pin', INCIDENT: 'Sự cố vận hành',
  NOT_STARTED: 'Chưa bắt đầu', VERIFIED: 'Đã xác minh', OLD_BATTERY_REMOVED: 'Đã tháo pin cũ', OLD_BATTERY_INSPECTED: 'Đã kiểm tra pin cũ',
  REPLACEMENT_ASSIGNED: 'Đã phân bổ pin thay thế', FAILED: 'Thất bại', ROLLED_BACK: 'Đã hoàn tác', SUCCESS: 'Thành công',
  VERIFY: 'Xác minh thông tin', REMOVE_OLD_BATTERY: 'Tháo pin cũ', INSPECT_OLD_BATTERY: 'Kiểm tra pin cũ',
  ASSIGN_REPLACEMENT: 'Phân bổ pin thay thế', INSTALL: 'Lắp pin mới', COLLECT_PAYMENT: 'Yêu cầu thanh toán', ROLLBACK: 'Hoàn tác giao dịch',
  MEMBER: 'Thành viên', STAFF: 'Nhân viên trạm', TECHNICIAN: 'Kỹ thuật viên', MANAGER: 'Quản lý trạm', ADMIN: 'Quản trị viên', SYSTEM: 'Hệ thống',
  CREATE: 'Tạo mới', UPDATE: 'Cập nhật', DELETE: 'Xóa', LOGIN: 'Đăng nhập', LOGOUT: 'Đăng xuất', APPROVE: 'Phê duyệt', REJECT: 'Từ chối',
  ADD: 'Thêm mới', TRANSFER: 'Chuyển trạm', RELEASED: 'Đã giải phóng', CONSUMED: 'Đã sử dụng',
};

const words: Record<string, string> = {
  CREATE: 'Tạo', CREATED: 'Đã tạo', UPDATE: 'Cập nhật', UPDATED: 'Đã cập nhật', DELETE: 'Xóa', DELETED: 'Đã xóa', ADD: 'Thêm', ADDED: 'Đã thêm', REMOVE: 'Gỡ', REMOVED: 'Đã gỡ', ASSIGN: 'Phân công', ASSIGNED: 'Đã phân công', TRANSFER: 'Chuyển', TRANSFERRED: 'Đã chuyển',
  STATION: 'trạm', USER: 'người dùng', ROLE: 'vai trò', STATUS: 'trạng thái', BOOKING: 'lịch thay pin', BATTERY: 'pin',
  BAY: 'khoang', SLOT: 'khung giờ', PAYMENT: 'thanh toán', VEHICLE: 'xe', ASSIGNMENT: 'phân công', SETTINGS: 'cấu hình',
  APPROVE: 'phê duyệt', APPROVED: 'đã phê duyệt', REJECT: 'từ chối', REJECTED: 'đã từ chối', COMPLETE: 'hoàn tất', COMPLETED: 'đã hoàn tất', CANCEL: 'hủy', CANCELLED: 'đã hủy', INSPECT: 'kiểm tra', INSPECTED: 'đã kiểm tra', MAINTENANCE: 'bảo trì',
  LOGIN: 'đăng nhập', LOGOUT: 'đăng xuất', CHANGE: 'thay đổi', CHANGED: 'đã thay đổi', ACTIVATE: 'kích hoạt', DEACTIVATE: 'ngừng kích hoạt',
};

const translateParts = (value: string) => {
  const parts = value.split('_');
  const translated = parts.map((part) => words[part] ?? labels[part] ?? part);
  return translated.some((part, index) => part !== parts[index]) ? translated.join(' ') : 'Chưa xác định';
};

export const viLabel = (value?: string | null) => value ? (labels[value] ?? translateParts(value)) : '—';
export const roleLabel = (value?: string | null) => viLabel(value);
export const statusLabel = (value?: string | null) => viLabel(value);
