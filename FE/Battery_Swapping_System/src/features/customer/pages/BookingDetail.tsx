import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CalendarCheck, MapPin, User, Car, Clock, ShieldAlert, Check, ArrowLeft, AlertTriangle, FileText, UserCheck } from 'lucide-react';
import { bookingService, type BookingDetail as BookingDetailData } from '../../../services/bookingService';
import { getApiErrorMessage } from '../../../services/apiClient';
import { LoadingSpinner } from '../../../components/feedback/LoadingSpinner';
import { Button } from '../../../components/ui/Button';
import { useAuth } from '../../../hooks/useAuth';
import { getBookingStatusLabel, getApprovalActionLabel } from '../../../utils/bookingStatus';
import { statusLabel as getSwapStatusLabel } from '../../../utils/viLabels';
import { BookingHoldCountdown } from '../../../components/bookings/BookingHoldCountdown';
import { memberService } from '../../../services/memberService';

const stages = ['PENDING_APPROVAL', 'APPROVED', 'CHECKED_IN', 'VERIFIED', 'PAYMENT_PENDING', 'COMPLETED'];

type SwapTimelineStep = {
  toStatus: string;
  data?: Record<string, unknown> | null;
};

const textValue = (value: unknown) => typeof value === 'string' && value.trim() ? value.trim() : '';
const numberValue = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : null;

const getSwapTimelineTitle = (step: SwapTimelineStep) => {
  if (step.data?.action === 'CANCEL_REPLACEMENT_RESERVATION') {
    return 'Đã hủy phân bổ pin thay thế';
  }
  return getSwapStatusLabel(step.toStatus);
};

const getSwapTimelineDetail = (step: SwapTimelineStep) => {
  const data = step.data ?? {};
  const action = textValue(data.action);
  const batteryCode = textValue(data.batteryCode) || textValue(data.serialNumber);
  const soc = numberValue(data.soc);
  const soh = numberValue(data.soh);
  const amount = numberValue(data.amount);
  const paymentMethod = textValue(data.paymentMethod);

  if (action === 'CHECK_IN') return 'Xác minh khách đã đến trạm';
  if (action === 'CANCEL_REPLACEMENT_RESERVATION') {
    return batteryCode ? `Đã trả pin ${batteryCode} về kho` : 'Pin đã giữ được trả về kho';
  }
  if (step.toStatus === 'VERIFIED') {
    const oldBattery = textValue(data.vehicleBatterySerial);
    return oldBattery ? `Đã đối chiếu khách hàng, xe và pin ${oldBattery}` : 'Đã đối chiếu thông tin khách hàng và xe';
  }
  if (step.toStatus === 'OLD_BATTERY_REMOVED') {
    const metrics = [
      batteryCode ? `Pin ${batteryCode}` : '',
      soc !== null ? `SOC ${soc}%` : '',
      soh !== null ? `SOH ${soh}%` : '',
    ].filter(Boolean);
    return metrics.length ? metrics.join(' · ') : 'Đã tháo pin cũ khỏi xe';
  }
  if (step.toStatus === 'OLD_BATTERY_INSPECTED') {
    return soh !== null ? `Kết quả kiểm tra: SOH ${soh}%` : 'Đã ghi nhận kết quả kiểm tra pin cũ';
  }
  if (step.toStatus === 'REPLACEMENT_ASSIGNED') {
    return batteryCode ? `Đã giữ pin ${batteryCode} từ kho trạm` : 'Đã giữ pin thay thế từ kho trạm';
  }
  if (step.toStatus === 'INSTALLED') {
    return batteryCode ? `Đã lắp pin ${batteryCode} vào xe` : 'Đã lắp pin thay thế vào xe';
  }
  if (step.toStatus === 'PAYMENT_PENDING') {
    return amount !== null
      ? `Đã tạo yêu cầu thanh toán ${amount.toLocaleString('vi-VN')} VND${paymentMethod ? ` qua ${paymentMethod}` : ''}`
      : 'Đã tạo yêu cầu thanh toán';
  }
  if (step.toStatus === 'COMPLETED' && amount !== null) {
    const methodLabel = paymentMethod === 'CASH' ? 'tiền mặt' : paymentMethod || 'hệ thống';
    return `Đã thanh toán ${amount.toLocaleString('vi-VN')} VND qua ${methodLabel}`;
  }
  return action ? getSwapStatusLabel(action) : '';
};

export const BookingDetail = () => {
  const { user } = useAuth();
  const { bookingId = '' } = useParams();
  const [item, setItem] = useState<BookingDetailData | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    () => bookingService.getById(bookingId).then(setItem).catch((cause) => setError(getApiErrorMessage(cause))),
    [bookingId],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const cancel = async () => {
    setBusy(true);
    setError('');
    try {
      await bookingService.cancel(bookingId);
      memberService.clearDashboardCache();
      await load();
    } catch (cause) {
      setError(getApiErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  if (!item && !error) return <LoadingSpinner label="Đang tải chi tiết đặt lịch..." />;
  if (error && !item) {
    return (
      <div className="mx-auto max-w-4xl p-4">
        <div role="alert" className="flex items-center gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-rose-600 dark:text-rose-400">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      </div>
    );
  }

  const getEffectiveBookingStageIndex = (booking: BookingDetailData) => {
    if (['REJECTED', 'CANCELLED', 'EXPIRED'].includes(booking.status)) return -1;
    const latestSwap = booking.transactions?.[0];
    if (booking.status === 'COMPLETED' || latestSwap?.workflowStatus === 'COMPLETED') {
      return stages.indexOf('COMPLETED');
    }
    if (latestSwap?.workflowStatus === 'PAYMENT_PENDING') {
      return stages.indexOf('PAYMENT_PENDING');
    }
    if (latestSwap && latestSwap.workflowStatus !== 'NOT_STARTED') {
      return stages.indexOf('VERIFIED');
    }
    if (booking.status === 'CHECKED_IN' || latestSwap?.workflowStatus === 'NOT_STARTED') {
      return stages.indexOf('CHECKED_IN');
    }
    if (booking.status === 'APPROVED') {
      return stages.indexOf('APPROVED');
    }
    return stages.indexOf('PENDING_APPROVAL');
  };

  const terminal = ['REJECTED', 'CANCELLED', 'EXPIRED'].includes(item!.status);
  const current = getEffectiveBookingStageIndex(item!);
  const statusObj = getBookingStatusLabel(item!.status);

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5 dark:border-slate-800">
        <div>
          <Link to="/app/bookings" className="mb-2 inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-emerald-500 transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" /> Quay lại danh sách lịch thay pin
          </Link>
          <div className="flex items-center gap-2">
            <p className="eyebrow">Chi tiết lịch hẹn</p>
          </div>
        </div>
        <span className={`h-fit w-fit rounded-full px-4 py-1.5 text-xs font-extrabold shadow-sm ${statusObj.color}`}>
          {statusObj.label}
        </span>
      </div>

      {error && (
        <div role="alert" className="flex items-center gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-rose-600 dark:text-rose-400">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      <BookingHoldCountdown expiryTime={item!.expiryTime} status={item!.status} />

      {/* Thông tin lịch */}
      <section className="app-panel p-6">
        <h2 className="flex items-center gap-2 text-lg font-black text-slate-900 dark:text-white">
          <CalendarCheck className="h-5 w-5 text-emerald-500" />
          <span>Thông tin lịch hẹn</span>
        </h2>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-1">
              <MapPin className="h-3.5 w-3.5 text-emerald-500" /> Trạm phục vụ
            </p>
            <p className="font-extrabold text-slate-900 dark:text-white">{item!.station.name}</p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{item!.station.address}</p>
          </div>

          <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-1">
              <Clock className="h-3.5 w-3.5 text-emerald-500" /> Khung giờ hẹn
            </p>
            <p className="font-extrabold text-slate-900 dark:text-white">
              {item!.scheduledStart ? new Date(item!.scheduledStart).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'}
              {item!.scheduledEnd ? ` - ${new Date(item!.scheduledEnd).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}` : ''}
            </p>
          </div>

          {item!.serviceBay && (
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Khoang phục vụ</p>
              <p className="font-bold text-slate-900 dark:text-white">{item!.serviceBay.bayName}</p>
            </div>
          )}

          <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Mức giá dự kiến</p>
            <p className="font-black text-emerald-600 dark:text-emerald-400">
              {item!.costEstimate === undefined ? 'Chưa có dữ liệu' : `${item!.costEstimate.toLocaleString('vi-VN')} VND`}
            </p>
          </div>

          {item!.battery && (
            <div className="sm:col-span-2 rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Pin đã giữ chỗ</p>
              <p className="font-mono font-bold text-slate-900 dark:text-white">{item!.battery.serialNumber}</p>
            </div>
          )}
        </div>

        {item!.reason && !item!.mandatory && (
          <div className="mt-4 rounded-xl border border-blue-500/20 bg-blue-500/10 p-4 text-blue-800 dark:text-blue-300">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-1">Ghi chú / Mô tả:</p>
            <p className="text-sm font-medium">{item!.reason}</p>
          </div>
        )}

        {item!.mandatory && (
          <div className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-rose-700 dark:text-rose-300">
            <div className="flex items-center gap-2 font-bold text-rose-700 dark:text-rose-400">
              <ShieldAlert className="h-4 w-4" />
              <span>Yêu cầu thay pin bắt buộc (Ưu tiên {item!.priority})</span>
            </div>
            <p className="mt-1 text-sm font-medium">{item!.reason}</p>
          </div>
        )}
      </section>

      {/* Thông tin khách hàng & Xe */}
      <section className="app-panel p-6">
        <h2 className="flex items-center gap-2 text-lg font-black text-slate-900 dark:text-white">
          <User className="h-5 w-5 text-emerald-500" />
          <span>Thông tin khách hàng & Phương tiện</span>
        </h2>

        <div className="mt-5 grid gap-6 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-5 dark:border-slate-800 dark:bg-slate-900/60 space-y-2">
            <h3 className="font-extrabold text-slate-900 dark:text-white border-b border-slate-200/80 pb-2 dark:border-slate-800">
              Khách hàng
            </h3>
            <div className="space-y-1.5 text-sm text-slate-700 dark:text-slate-300">
              <p><span className="font-semibold text-slate-500 dark:text-slate-400">Họ tên:</span> <strong className="text-slate-900 dark:text-white">{user?.name}</strong></p>
              <p><span className="font-semibold text-slate-500 dark:text-slate-400">SĐT:</span> <strong className="text-slate-900 dark:text-white">{user?.phoneNumber || 'Chưa cập nhật'}</strong></p>
              <p><span className="font-semibold text-slate-500 dark:text-slate-400">Email:</span> <strong className="text-slate-900 dark:text-white">{user?.email || 'Chưa cập nhật'}</strong></p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-5 dark:border-slate-800 dark:bg-slate-900/60 space-y-2">
            <h3 className="font-extrabold text-slate-900 dark:text-white border-b border-slate-200/80 pb-2 dark:border-slate-800 flex items-center justify-between">
              <span>Phương tiện</span>
              <Car className="h-4 w-4 text-emerald-500" />
            </h3>
            {item!.vehicle ? (
              <div className="space-y-1.5 text-sm text-slate-700 dark:text-slate-300">
                <p><span className="font-semibold text-slate-500 dark:text-slate-400">Tên xe:</span> <strong className="text-slate-900 dark:text-white">{item!.vehicle.name}</strong></p>
                <p><span className="font-semibold text-slate-500 dark:text-slate-400">Biển số:</span> <strong className="font-mono text-emerald-600 dark:text-emerald-400">{item!.vehicle.plateNumber}</strong></p>
                {item!.vehicle.batteryType && <p><span className="font-semibold text-slate-500 dark:text-slate-400">Loại pin:</span> {item!.vehicle.batteryType}</p>}
                {item!.vehicle.vinNumber && <p><span className="font-semibold text-slate-500 dark:text-slate-400">Số khung (VIN):</span> {item!.vehicle.vinNumber}</p>}
                {item!.vehicle.brand && <p><span className="font-semibold text-slate-500 dark:text-slate-400">Hãng / Dòng:</span> {item!.vehicle.brand} {item!.vehicle.model}</p>}
                {item!.vehicle.manufactureYear && <p><span className="font-semibold text-slate-500 dark:text-slate-400">Năm SX:</span> {item!.vehicle.manufactureYear}</p>}
                {item!.vehicle.color && <p><span className="font-semibold text-slate-500 dark:text-slate-400">Màu sắc:</span> {item!.vehicle.color}</p>}
              </div>
            ) : (
              <span className="text-sm text-slate-500 dark:text-slate-400">Chưa có thông tin xe</span>
            )}
          </div>
        </div>
      </section>

      {/* Tiến trình từ hệ thống */}
      <section className="app-panel p-6">
        <h2 className="flex items-center gap-2 text-lg font-black text-slate-900 dark:text-white">
          <FileText className="h-5 w-5 text-emerald-500" />
          <span>Tiến trình xử lý từ hệ thống</span>
        </h2>

        {terminal ? (
          <div className="mt-4 rounded-xl border border-slate-200/80 bg-slate-100 p-4 font-bold text-slate-700 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300">
            Kết thúc: {statusObj.label}{item!.rejectionReason ? ` — Lý do: ${item!.rejectionReason}` : ''}
          </div>
        ) : (
          <ol className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {stages.map((stage, index) => {
              const isPastOrCurrent = index <= current;
              return (
                <li
                  key={stage}
                  className={`rounded-xl border p-3 text-center text-xs font-bold transition-colors ${
                    isPastOrCurrent
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
                      : 'border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-500'
                  }`}
                >
                  {getBookingStatusLabel(stage).label}
                </li>
              );
            })}
          </ol>
        )}

        {item!.transactions?.[0]?.staff && (
          <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-800 dark:text-emerald-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white font-extrabold shrink-0">
                <UserCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  Nhân viên thực hiện / Phụ trách trạm
                </p>
                <p className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
                  {item!.transactions[0].staff.fullName}
                </p>
              </div>
            </div>
            {item!.transactions[0].staff.phone && (
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
                SĐT: {item!.transactions[0].staff.phone}
              </span>
            )}
          </div>
        )}

        <div className="mt-8 flex flex-col gap-4 relative pl-2">
          {item!.approvalHistory.map((event, idx) => (
            <div key={event.id} className="relative pl-6">
              <div className="absolute left-0 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/20 ring-4 ring-white dark:ring-slate-900">
                <Check className="h-2.5 w-2.5 text-emerald-500" />
              </div>
              {(idx !== item!.approvalHistory.length - 1 || item!.transactions?.length > 0) && (
                <div className="absolute left-[7px] top-5 bottom-[-16px] w-px bg-slate-200 dark:bg-slate-800" />
              )}
              <p className="text-sm font-extrabold text-slate-900 dark:text-white">
                {getApprovalActionLabel(event.action)} <span className="font-normal text-slate-500 dark:text-slate-400">bởi</span> {event.manager?.fullName || 'Quản trị viên'}
              </p>
              <p className="mt-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">{new Date(event.createdAt).toLocaleString('vi-VN')}</p>
              {event.reason && <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300">"{event.reason}"</p>}
            </div>
          ))}

          {item!.transactions?.flatMap((tx) => {
            const steps = (tx.stepHistory ?? []).filter(
              (step: any, sIdx: number, arr: any[]) => sIdx === 0 || step.toStatus !== arr[sIdx - 1].toStatus
            );
            return steps.map((step: any, sIdx: number) => {
              const isLast = sIdx === steps.length - 1 && tx === item!.transactions[item!.transactions.length - 1];
              return (
                <div key={step.id} className="relative pl-6">
                  <div className="absolute left-0 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500/20 ring-4 ring-white dark:ring-slate-900">
                    <Check className="h-2.5 w-2.5 text-blue-500" />
                  </div>
                  {!isLast && <div className="absolute left-[7px] top-5 bottom-[-16px] w-px bg-slate-200 dark:bg-slate-800" />}
                  <p className="text-sm font-extrabold text-slate-900 dark:text-white flex flex-wrap items-center gap-1.5">
                    <span>Thao tác thay pin:</span>
                    <span className="text-blue-600 dark:text-blue-400">{getSwapTimelineTitle(step)}</span>
                    {tx.staff?.fullName && (
                      <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                        (Bởi nhân viên: <strong className="text-slate-800 dark:text-slate-200">{tx.staff.fullName}</strong>)
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs font-bold text-blue-500">{new Date(step.createdAt).toLocaleString('vi-VN')}</p>
                  {getSwapTimelineDetail(step) && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Chi tiết: {getSwapTimelineDetail(step)}</p>}
                </div>
              );
            });
          })}

          {!item!.approvalHistory?.length && !item!.transactions?.length && (
            <p className="rounded-xl bg-slate-50 p-4 text-center text-sm font-medium italic text-slate-500 dark:bg-slate-800/40 dark:text-slate-400">
              Chưa có tiến trình nào được ghi nhận.
            </p>
          )}
        </div>
      </section>

      {/* Buttons Action */}
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/app/bookings">
          <Button variant="outline">Quay lại danh sách</Button>
        </Link>

        {['PENDING_APPROVAL', 'APPROVED', 'RESCHEDULED'].includes(item!.status) && (
          <Button variant="danger" loading={busy} onClick={() => void cancel()}>
            Hủy lịch
          </Button>
        )}

        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
          ℹ️ Phí dịch vụ được nhân viên thu trực tiếp tại trạm (Tiền mặt hoặc VNPay) khi đổi pin.
        </div>
      </div>
    </div>
  );
};
