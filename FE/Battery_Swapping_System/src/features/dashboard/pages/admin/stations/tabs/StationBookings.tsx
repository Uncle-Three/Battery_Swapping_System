import { useCallback, useEffect, useState, type FC } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle, CalendarCheck2, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight,
  CircleX, Clock3, Eye, Loader2, RotateCcw, Search, UserCheck,
} from 'lucide-react';
import { Badge } from '../../../../../../components/ui/Badge';
import { Button } from '../../../../../../components/ui/Button';
import { Modal } from '../../../../../../components/ui/Modal';
import { getApiErrorMessage } from '../../../../../../services/apiClient';
import {
  stationBookingService,
  type StationBooking,
  type StationBookingPage,
} from '../../../../../../services/stationDetailService';

const PAGE_SIZE = 10;
const cancellableStatuses = new Set([
  'CREATED',
  'PENDING_APPROVAL',
  'APPROVED',
  'RESCHEDULE_PROPOSED',
  'RESCHEDULED',
]);
const localDateInput = (value = new Date()) => {
  const offset = value.getTimezoneOffset() * 60_000;
  return new Date(value.getTime() - offset).toISOString().slice(0, 10);
};
const statusOptions = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'PENDING_APPROVAL', label: 'Chờ xác nhận' },
  { value: 'APPROVED', label: 'Đã xác nhận' },
  { value: 'CHECKED_IN', label: 'Đã check-in' },
  { value: 'COMPLETED', label: 'Hoàn tất' },
  { value: 'CANCELLED', label: 'Đã hủy' },
  { value: 'REJECTED', label: 'Đã từ chối' },
  { value: 'EXPIRED', label: 'Đã hết hạn' },
];

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'gray';
const statusMeta = (status: string): { label: string; variant: BadgeVariant } => {
  switch (status) {
    case 'CREATED':
    case 'PENDING_APPROVAL': return { label: 'Chờ xác nhận', variant: 'warning' };
    case 'APPROVED':
    case 'RESCHEDULED': return { label: 'Đã xác nhận', variant: 'info' };
    case 'CHECKED_IN': return { label: 'Đã check-in', variant: 'info' };
    case 'COMPLETED': return { label: 'Hoàn tất', variant: 'success' };
    case 'CANCELLED': return { label: 'Đã hủy', variant: 'error' };
    case 'REJECTED': return { label: 'Đã từ chối', variant: 'error' };
    case 'EXPIRED': return { label: 'Đã hết hạn', variant: 'gray' };
    case 'RESCHEDULE_PROPOSED': return { label: 'Đề xuất đổi lịch', variant: 'warning' };
    default: return { label: status, variant: 'gray' };
  }
};

const formatDate = (value?: string | null) => value
  ? new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value))
  : 'Chưa có ngày hẹn';
const formatTime = (value?: string | null) => value
  ? new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value))
  : '';
const formatCreatedAt = (value: string) => new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
}).format(new Date(value));

const Appointment = ({ booking }: { booking: StationBooking }) => (
  <div>
    <div className="font-semibold text-slate-900 dark:text-white">{formatDate(booking.scheduledStart)}</div>
    {booking.scheduledStart && (
      <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
        {formatTime(booking.scheduledStart)}
        {booking.scheduledEnd ? ` – ${formatTime(booking.scheduledEnd)}` : ''}
      </div>
    )}
  </div>
);

const ServiceLocation = ({ booking }: { booking: StationBooking }) => {
  const bayCode = booking.serviceBay?.bayCode;
  const staffName = booking.transactions?.[0]?.staff?.fullName;
  if (!bayCode && !staffName) return <span className="text-slate-500">Chưa phân công</span>;
  return (
    <div>
      <div className="font-semibold">{bayCode ? `Khoang ${bayCode}` : 'Chưa phân công khoang'}</div>
      <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
        {staffName ? `Nhân viên: ${staffName}` : 'Chưa có nhân viên phụ trách'}
      </div>
    </div>
  );
};

export const StationBookings: FC = () => {
  const { stationId = '' } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<StationBookingPage>();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('');
  const [date, setDate] = useState('');
  const [batteryType, setBatteryType] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelBooking, setCancelBooking] = useState<StationBooking | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const from = date ? new Date(`${date}T00:00:00`).toISOString() : undefined;
      const to = date ? new Date(`${date}T23:59:59.999`).toISOString() : undefined;
      setData(await stationBookingService.list(stationId, {
        search: debouncedSearch || undefined, status: status || undefined, batteryType: batteryType || undefined,
        from, to, page, limit: PAGE_SIZE,
      }));
    } catch (cause) {
      setError(getApiErrorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, [stationId, debouncedSearch, status, date, batteryType, page]);

  useEffect(() => { void load(); }, [load]);

  const resetFilters = () => {
    setSearch(''); setDebouncedSearch(''); setStatus(''); setDate(''); setBatteryType(''); setPage(1);
  };
  const setStatusFilter = (value: string) => { setStatus(value); setPage(1); };
  const applySummaryFilter = (value: string) => { setStatus(value); setDate(localDateInput()); setPage(1); };
  const detail = (id: string) => navigate(`/admin/stations/${stationId}/bookings/${id}`);
  const openCancel = (booking: StationBooking) => {
    setCancelBooking(booking);
    setCancelReason('');
    setCancelError('');
  };
  const closeCancel = () => {
    if (cancelling) return;
    setCancelBooking(null);
    setCancelReason('');
    setCancelError('');
  };
  const confirmCancel = async () => {
    if (!cancelBooking) return;
    const reason = cancelReason.trim();
    if (reason.length < 3) {
      setCancelError('Vui lòng nhập lý do hủy có ít nhất 3 ký tự.');
      return;
    }
    try {
      setCancelling(true);
      setCancelError('');
      await stationBookingService.cancel(stationId, cancelBooking.id, reason);
      setCancelBooking(null);
      setCancelReason('');
      await load();
    } catch (cause) {
      setCancelError(getApiErrorMessage(cause, 'Không thể hủy lịch đặt chỗ.'));
    } finally {
      setCancelling(false);
    }
  };
  const hasFilters = Boolean(search || status || date || batteryType);
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const inputStyle = 'min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white';
  const summaryCards = [
    { label: 'Tổng lịch hôm nay', value: data?.summary.totalToday ?? 0, status: '', icon: CalendarCheck2, color: 'text-slate-700 dark:text-slate-200' },
    { label: 'Chờ xác nhận', value: data?.summary.pending ?? 0, status: 'PENDING_APPROVAL', icon: Clock3, color: 'text-amber-600' },
    { label: 'Đã xác nhận', value: data?.summary.confirmed ?? 0, status: 'APPROVED', icon: CheckCircle2, color: 'text-blue-600' },
    { label: 'Đã check-in', value: data?.summary.checkedIn ?? 0, status: 'CHECKED_IN', icon: UserCheck, color: 'text-cyan-600' },
    { label: 'Hoàn tất', value: data?.summary.completed ?? 0, status: 'COMPLETED', icon: CheckCircle2, color: 'text-emerald-600' },
    { label: 'Đã hủy', value: data?.summary.cancelled ?? 0, status: 'CANCELLED', icon: CircleX, color: 'text-rose-600' },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">Lịch đặt chỗ</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Quản lý các lịch thay pin thuộc trạm hiện tại.</p>
      </div>

      <section aria-label="Tổng quan lịch đặt chỗ" className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          const active = status === card.status && date === localDateInput();
          return (
            <button type="button" key={card.label} onClick={() => applySummaryFilter(card.status)}
              className={`rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-slate-900 ${active ? 'border-emerald-500 ring-1 ring-emerald-500' : 'border-slate-200 dark:border-slate-800'}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{card.label}</span>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </div>
              <div className={`mt-2 text-2xl font-black ${card.color}`}>{card.value}</div>
            </button>
          );
        })}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(280px,1fr)_180px_190px_190px_auto]">
          <label className="relative">
            <span className="sr-only">Tìm kiếm lịch đặt chỗ</span>
            <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
            <input className={`${inputStyle} w-full pl-9`} placeholder="Tìm mã đặt chỗ, khách hàng hoặc biển số..."
              value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
          </label>
          <input aria-label="Ngày hẹn" type="date" className={inputStyle} value={date}
            onChange={(event) => { setDate(event.target.value); setPage(1); }} />
          <select aria-label="Trạng thái lịch đặt chỗ" className={inputStyle} value={status}
            onChange={(event) => setStatusFilter(event.target.value)}>
            {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <select aria-label="Loại pin" className={inputStyle} value={batteryType}
            onChange={(event) => { setBatteryType(event.target.value); setPage(1); }}>
            <option value="">Tất cả loại pin</option>
            {(data?.batteryTypes ?? []).map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
          <Button variant="outline" onClick={resetFilters} disabled={!hasFilters}>
            <RotateCcw className="h-4 w-4" />Đặt lại
          </Button>
        </div>
      </section>

      {error && (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span className="mr-auto">Không thể tải lịch đặt chỗ. Vui lòng thử lại.</span>
          <Button size="sm" variant="outline" onClick={() => void load()}>Thử lại</Button>
        </div>
      )}

      {loading ? (
        <div className="grid min-h-64 place-items-center rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="text-center text-sm font-semibold text-slate-500">
            <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-emerald-500" />Đang tải lịch đặt chỗ...
          </div>
        </div>
      ) : !error && data?.items.length ? (
        <>
          <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:block">
            <div className="max-h-[640px] overflow-auto">
              <table className="w-full min-w-[1120px] text-left text-sm">
                <thead className="sticky top-0 z-10 bg-slate-50 text-xs font-extrabold uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                  <tr>
                    {['Mã đặt chỗ', 'Khách hàng', 'Xe và loại pin', 'Lịch hẹn', 'Vị trí phục vụ', 'Trạng thái', 'Thời gian tạo', 'Thao tác'].map((label) => (
                      <th className="px-4 py-3.5" key={label}>{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 dark:divide-slate-800 dark:text-slate-200">
                  {data.items.map((booking) => {
                    const meta = statusMeta(booking.status);
                    const battery = booking.vehicle?.batteryType || booking.battery?.batteryType?.code;
                    return (
                      <tr key={booking.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-4 font-mono text-xs font-bold text-slate-900 dark:text-white">{booking.bookingCode}</td>
                        <td className="px-4 py-4">
                          <div className="font-bold text-slate-900 dark:text-white">{booking.user?.fullName || 'Chưa có tên'}</div>
                          <div className="mt-0.5 max-w-48 truncate text-xs text-slate-500">{booking.user?.email || 'Chưa có email'}</div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-semibold text-slate-900 dark:text-white">{booking.vehicle?.name || booking.vehicle?.model || 'Chưa có thông tin xe'}</div>
                          <div className="mt-0.5 text-xs text-slate-500">{booking.vehicle?.plateNumber || 'Chưa có biển số'}</div>
                          {battery && <Badge variant="gray" className="mt-1.5 font-mono">{battery}</Badge>}
                        </td>
                        <td className="px-4 py-4"><Appointment booking={booking} /></td>
                        <td className="px-4 py-4"><ServiceLocation booking={booking} /></td>
                        <td className="px-4 py-4"><Badge variant={meta.variant}>{meta.label}</Badge></td>
                        <td className="whitespace-nowrap px-4 py-4 text-xs">{formatCreatedAt(booking.createdAt)}</td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline" onClick={() => detail(booking.id)}>
                              <Eye className="h-4 w-4" />Chi tiết
                            </Button>
                            {cancellableStatuses.has(booking.status) && (
                              <Button size="sm" variant="danger" onClick={() => openCancel(booking)}>
                                <CircleX className="h-4 w-4" />Hủy lịch
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-3 lg:hidden">
            {data.items.map((booking) => {
              const meta = statusMeta(booking.status);
              const battery = booking.vehicle?.batteryType || booking.battery?.batteryType?.code;
              return (
                <article key={booking.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-start justify-between gap-3">
                    <span className="break-all font-mono text-xs font-bold text-slate-900 dark:text-white">{booking.bookingCode}</span>
                    <Badge variant={meta.variant} className="shrink-0">{meta.label}</Badge>
                  </div>
                  <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
                    <div className="font-bold text-slate-900 dark:text-white">{booking.user?.fullName || 'Chưa có tên'}</div>
                    <div className="mt-2 font-semibold">{booking.vehicle?.name || booking.vehicle?.model || 'Chưa có thông tin xe'}</div>
                    <div className="text-xs text-slate-500">{booking.vehicle?.plateNumber || 'Chưa có biển số'}</div>
                    {battery && <Badge variant="gray" className="mt-2 font-mono">{battery}</Badge>}
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 text-sm dark:border-slate-800">
                    <div><div className="mb-1 text-xs font-bold uppercase text-slate-400">Lịch hẹn</div><Appointment booking={booking} /></div>
                    <div><div className="mb-1 text-xs font-bold uppercase text-slate-400">Vị trí phục vụ</div><ServiceLocation booking={booking} /></div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <Button
                      className={cancellableStatuses.has(booking.status) ? '' : 'col-span-2'}
                      size="sm"
                      variant="outline"
                      onClick={() => detail(booking.id)}
                    >
                      <Eye className="h-4 w-4" />Xem chi tiết
                    </Button>
                    {cancellableStatuses.has(booking.status) && (
                      <Button size="sm" variant="danger" onClick={() => openCancel(booking)}>
                        <CircleX className="h-4 w-4" />Hủy lịch
                      </Button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </>
      ) : !error ? (
        <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
          <CalendarDays className="h-10 w-10 text-slate-400" />
          <h3 className="mt-3 text-lg font-bold text-slate-900 dark:text-white">
            {hasFilters ? 'Không tìm thấy lịch đặt chỗ phù hợp với bộ lọc.' : 'Chưa có lịch đặt chỗ'}
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {hasFilters ? 'Hãy điều chỉnh hoặc đặt lại bộ lọc để xem kết quả khác.' : 'Các lịch thay pin của trạm sẽ xuất hiện tại đây.'}
          </p>
          {hasFilters && <Button className="mt-4" variant="outline" onClick={resetFilters}>Đặt lại bộ lọc</Button>}
        </div>
      ) : null}

      {data && data.total > 0 && !error && (
        <div className="flex flex-col items-center justify-between gap-3 text-sm text-slate-600 sm:flex-row dark:text-slate-400">
          <span>Hiển thị {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, data.total)} trong {data.total} lịch đặt chỗ</span>
          <div className="flex items-center gap-2">
            <Button aria-label="Trang trước" size="sm" variant="outline" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>
              <ChevronLeft className="h-4 w-4" />Trước
            </Button>
            <span className="min-w-20 text-center font-semibold">Trang {page}/{totalPages}</span>
            <Button aria-label="Trang sau" size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)}>
              Sau<ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <Modal
        isOpen={Boolean(cancelBooking)}
        onClose={closeCancel}
        title="Hủy lịch đặt chỗ?"
        footer={(
          <>
            <Button variant="outline" onClick={closeCancel} disabled={cancelling}>
              Đóng
            </Button>
            <Button variant="danger" loading={cancelling} onClick={() => void confirmCancel()}>
              <CircleX className="h-4 w-4" />
              Xác nhận hủy
            </Button>
          </>
        )}
      >
        <div className="space-y-4">
          <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
            <p className="font-mono text-sm font-black text-slate-900 dark:text-white">
              {cancelBooking?.bookingCode}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {cancelBooking?.user?.fullName ?? 'Khách hàng'}
              {cancelBooking?.scheduledStart
                ? ` · ${formatDate(cancelBooking.scheduledStart)} ${formatTime(cancelBooking.scheduledStart)}`
                : ''}
            </p>
          </div>

          <p className="text-sm text-slate-600 dark:text-slate-300">
            Sau khi hủy, slot, khoang và pin đang được giữ cho lịch này sẽ được giải phóng.
          </p>

          {cancelError && (
            <div role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:bg-red-950/30 dark:text-red-300">
              {cancelError}
            </div>
          )}

          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
            Lý do hủy
            <textarea
              className="mt-2 w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              value={cancelReason}
              onChange={(event) => setCancelReason(event.target.value)}
              placeholder="Nhập lý do hủy lịch đặt chỗ..."
              maxLength={500}
              rows={3}
              disabled={cancelling}
              autoFocus
            />
          </label>
        </div>
      </Modal>
    </div>
  );
};
