export const getBookingStatusLabel = (status: string) => {
  switch (status) {
    case 'CREATED': return { label: 'Khởi tạo', color: 'bg-slate-100 text-slate-700' };
    case 'PENDING_APPROVAL': return { label: 'Chờ duyệt', color: 'bg-yellow-100 text-yellow-700' };
    case 'APPROVED': return { label: 'Đã duyệt', color: 'bg-blue-100 text-blue-700' };
    case 'REJECTED': return { label: 'Từ chối', color: 'bg-red-100 text-red-700' };
    case 'RESCHEDULE_PROPOSED': return { label: 'Đề xuất đổi lịch', color: 'bg-orange-100 text-orange-700' };
    case 'RESCHEDULED': return { label: 'Đã đổi lịch', color: 'bg-blue-100 text-blue-700' };
    case 'CHECKED_IN': return { label: 'Đã đến trạm', color: 'bg-indigo-100 text-indigo-700' };
    case 'IN_PROGRESS': return { label: 'Đang xử lý', color: 'bg-teal-100 text-teal-700' };
    case 'PAYMENT_PENDING': return { label: 'Chờ thanh toán', color: 'bg-yellow-100 text-yellow-700' };
    case 'COMPLETED': return { label: 'Hoàn thành', color: 'bg-green-100 text-green-700' };
    case 'CANCELLED': return { label: 'Đã hủy', color: 'bg-gray-100 text-gray-700' };
    case 'EXPIRED': return { label: 'Hết hạn', color: 'bg-red-100 text-red-700' };
    default: return { label: status, color: 'bg-slate-100 text-slate-700' };
  }
};

export const getReservationStatusLabel = (status: string) => {
  switch (status) {
    case 'ACTIVE': return 'Đang giữ';
    case 'RELEASED': return 'Đã giải phóng';
    case 'CONSUMED': return 'Đã sử dụng';
    case 'EXPIRED': return 'Hết hạn';
    default: return status;
  }
};

export const getApprovalActionLabel = (action: string) => {
  switch (action) {
    case 'APPROVED': return 'Duyệt';
    case 'REJECTED': return 'Từ chối';
    case 'RESCHEDULED': return 'Đổi lịch';
    default: return action;
  }
};
