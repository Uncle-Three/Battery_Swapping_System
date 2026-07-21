import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { bookingService, type BookingDetail as BookingDetailData } from '../../../services/bookingService';
import { getApiErrorMessage } from '../../../services/apiClient';
import { LoadingSpinner } from '../../../components/feedback/LoadingSpinner';
import { Button } from '../../../components/ui/Button';
import { useAuth } from '../../../hooks/useAuth';
import { CreditCard } from 'lucide-react';
import { getBookingStatusLabel, getApprovalActionLabel } from '../../../utils/bookingStatus';
import { statusLabel as getSwapStatusLabel } from '../../../utils/viLabels';
import { Check } from 'lucide-react';

const stages = ['PENDING_APPROVAL', 'APPROVED', 'CHECKED_IN', 'PAYMENT_PENDING', 'COMPLETED'];
export const BookingDetail = () => {
  const { user } = useAuth();
  const { bookingId = '' } = useParams(); const [item, setItem] = useState<BookingDetailData | null>(null); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const load = useCallback(() => bookingService.getById(bookingId).then(setItem).catch((cause) => setError(getApiErrorMessage(cause))), [bookingId]);
  useEffect(() => { void load(); }, [load]);
  const cancel = async () => { setBusy(true); setError(''); try { await bookingService.cancel(bookingId); await load(); } catch (cause) { setError(getApiErrorMessage(cause)); } finally { setBusy(false); } };
  if (!item && !error) return <LoadingSpinner label="Đang tải chi tiết đặt lịch..." />;
  if (error && !item) return <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p>;
  const terminal = ['REJECTED', 'CANCELLED', 'EXPIRED'].includes(item!.status); const current = stages.indexOf(item!.status);
  const statusObj = getBookingStatusLabel(item!.status);
  return <div className="mx-auto max-w-4xl space-y-6"><div className="flex flex-wrap justify-between gap-3"><div><p className="text-sm text-slate-500">Mã đặt lịch</p><h1 className="font-mono text-2xl font-black">{item!.id}</h1></div><span className={`h-fit rounded-full px-4 py-2 font-bold ${statusObj.color}`}>{statusObj.label}</span></div>{error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
    <section className="rounded-2xl border bg-white p-6"><h2 className="text-xl font-black">Thông tin lịch</h2><div className="mt-4 grid gap-3 sm:grid-cols-2"><p><strong>Trạm:</strong> {item!.station.name}<br/><span className="text-sm text-slate-500">{item!.station.address}</span></p>{item!.serviceBay && <p><strong>Khoang:</strong> {item!.serviceBay.bayName}</p>}{item!.slot && <p><strong>Khay pin:</strong> {item!.slot.slotNumber}</p>}<p><strong>Giá dự kiến:</strong> {item!.costEstimate === undefined ? 'Chưa có dữ liệu' : `${item!.costEstimate.toLocaleString('vi-VN')} VND`}</p><p><strong>Khung giờ:</strong> {item!.scheduledStart ? new Date(item!.scheduledStart).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'} {item!.scheduledEnd ? ` - ${new Date(item!.scheduledEnd).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}` : ''}</p>{item!.battery && <p><strong>Pin được giữ:</strong> {item!.battery.serialNumber}</p>}</div>{item!.reason && !item!.mandatory && <div className="mt-4 rounded-xl bg-blue-50 p-4 text-blue-800"><p className="font-bold">Ghi chú / Mô tả:</p><p className="font-normal">{item!.reason}</p></div>}{item!.mandatory && <div className="mt-4 rounded-xl bg-red-50 p-4 font-bold text-red-800">Yêu cầu thay pin bắt buộc. Ưu tiên {item!.priority}<p className="font-normal">{item!.reason}</p></div>}</section>
     <section className="rounded-2xl border bg-white p-6"><h2 className="text-xl font-black">Thông tin khách hàng & Xe</h2><div className="mt-4 grid gap-4 sm:grid-cols-2"><div><h3 className="mb-2 font-bold text-slate-700">Khách hàng</h3><ul className="space-y-1 text-sm text-slate-600"><li><strong>Họ tên:</strong> {user?.name}</li><li><strong>SĐT:</strong> {user?.phoneNumber || 'Chưa cập nhật'}</li><li><strong>Email:</strong> {user?.email || 'Chưa cập nhật'}</li></ul></div><div><h3 className="mb-2 font-bold text-slate-700">Phương tiện</h3>{item!.vehicle ? <ul className="space-y-1 text-sm text-slate-600"><li><strong>Tên xe:</strong> {item!.vehicle.name}</li><li><strong>Biển số:</strong> {item!.vehicle.plateNumber}</li>{item!.vehicle.batteryType && <li><strong>Loại pin:</strong> {item!.vehicle.batteryType}</li>}{item!.vehicle.vinNumber && <li><strong>Số khung (VIN):</strong> {item!.vehicle.vinNumber}</li>}{item!.vehicle.brand && <li><strong>Hãng / Dòng:</strong> {item!.vehicle.brand} {item!.vehicle.model}</li>}{item!.vehicle.manufactureYear && <li><strong>Năm SX:</strong> {item!.vehicle.manufactureYear}</li>}{item!.vehicle.color && <li><strong>Màu sắc:</strong> {item!.vehicle.color}</li>}</ul> : <span className="text-sm text-slate-500">Chưa có thông tin xe</span>}</div></div></section>
    <section className="rounded-2xl border bg-white p-6">
      <h2 className="text-xl font-black">Tiến trình từ hệ thống</h2>
      {terminal ? (
        <p className="mt-4 rounded-lg bg-slate-100 p-4 font-bold">
          Kết thúc: {statusObj.label}{item!.rejectionReason ? ` — ${item!.rejectionReason}` : ''}
        </p>
      ) : (
        <ol className="mt-5 grid gap-3 sm:grid-cols-5">
          {stages.map((stage, index) => (
            <li key={stage} className={`rounded-xl border p-3 text-center text-xs font-bold ${index <= current ? 'border-green-500 bg-green-50 text-green-800' : 'text-slate-400'}`}>
              {getBookingStatusLabel(stage).label}
            </li>
          ))}
        </ol>
      )}
      <div className="mt-8 flex flex-col gap-4 relative pl-2">
        {item!.approvalHistory.map((event, idx) => (
          <div key={event.id} className="relative pl-6">
            <div className="absolute left-0 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100 ring-4 ring-white"><Check className="h-2.5 w-2.5 text-emerald-600" /></div>
            {(idx !== item!.approvalHistory.length - 1 || item!.transactions?.length > 0) && <div className="absolute left-[7px] top-5 bottom-[-16px] w-px bg-slate-200" />}
            <p className="text-sm font-extrabold text-slate-900">
              {getApprovalActionLabel(event.action)} <span className="font-medium text-slate-500">bởi</span> Quản trị viên
            </p>
            <p className="mt-1 text-xs font-bold text-emerald-600">{new Date(event.createdAt).toLocaleString('vi-VN')}</p>
            {event.reason && <p className="mt-2 text-sm text-slate-600">"{event.reason}"</p>}
          </div>
        ))}
        {item!.transactions?.flatMap(tx => tx.stepHistory?.map((step: any, sIdx: number) => {
          const isLast = sIdx === tx.stepHistory!.length - 1 && tx === item!.transactions[item!.transactions.length - 1];
          return (
            <div key={step.id} className="relative pl-6">
              <div className="absolute left-0 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-100 ring-4 ring-white"><Check className="h-2.5 w-2.5 text-blue-600" /></div>
              {!isLast && <div className="absolute left-[7px] top-5 bottom-[-16px] w-px bg-slate-200" />}
              <p className="text-sm font-extrabold text-slate-900">
                Thao tác thay pin: <span className="text-blue-700">{getSwapStatusLabel(step.toStatus)}</span>
              </p>
              <p className="mt-1 text-xs font-bold text-blue-600">{new Date(step.createdAt).toLocaleString('vi-VN')}</p>
              {step.data?.action && <p className="mt-1 text-xs text-slate-500">Chi tiết: {getSwapStatusLabel(step.data.action)}</p>}
            </div>
          );
        }))}
        {!item!.approvalHistory?.length && !item!.transactions?.length && (
          <p className="text-sm font-semibold text-slate-500 italic text-center py-4 bg-slate-50 rounded-xl">Chưa có tiến trình nào được ghi nhận.</p>
        )}
      </div>
    </section>

    <div className="flex flex-wrap gap-3"><Link to="/app/bookings"><Button variant="outline">Quay lại danh sách</Button></Link>{['PENDING_APPROVAL', 'APPROVED', 'RESCHEDULED'].includes(item!.status) && <Button variant="danger" loading={busy} onClick={() => void cancel()}>Hủy lịch</Button>}{(item!.status === 'COMPLETED' || item!.transactions.some((transaction) => transaction.workflowStatus === 'PAYMENT_PENDING')) && <Link to={`/app/payments/${item!.id}`}><Button variant="primary" className="flex items-center gap-2"><CreditCard className="h-4 w-4" />{item!.status === 'COMPLETED' ? 'Xem thanh toán' : 'Thanh toán ngay'}</Button></Link>}</div>
  </div>;
};
