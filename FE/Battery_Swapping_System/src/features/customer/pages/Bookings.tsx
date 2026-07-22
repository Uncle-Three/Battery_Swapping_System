import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Plus, MapPin, Car, Clock, AlertTriangle, ArrowRight, CalendarX } from 'lucide-react';
import { bookingService, type BookingDetail } from '../../../services/bookingService';
import { getApiErrorMessage } from '../../../services/apiClient';
import { LoadingSpinner } from '../../../components/feedback/LoadingSpinner';
import { Button } from '../../../components/ui/Button';
import { getBookingStatusLabel } from '../../../utils/bookingStatus';

export const Bookings = () => {
  const [items, setItems] = useState<BookingDetail[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    bookingService
      .getAll()
      .then(setItems)
      .catch((cause) => setError(getApiErrorMessage(cause)));
  }, []);

  if (!items && !error) {
    return <LoadingSpinner label="Đang tải lịch thay pin..." />;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-12">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-5 dark:border-slate-800">
        <div>
          <div className="eyebrow flex items-center gap-2 mb-1">
            <Calendar className="h-4 w-4 text-emerald-500" />
            <span>Quản lý lịch hẹn</span>
          </div>
          <h1 className="page-title">Lịch thay pin của tôi</h1>
          <p className="page-description">Theo dõi trạng thái và tiến trình xử lý lịch thay pin xe điện.</p>
        </div>
        <Link to="/app/bookings/new">
          <Button className="w-full sm:w-auto inline-flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 transition-all hover:scale-[1.02]">
            <Plus className="h-4 w-4" />
            <span>Đặt lịch mới</span>
          </Button>
        </Link>
      </div>

      {/* Error Alert */}
      {error && (
        <div role="alert" className="flex items-center gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-rose-600 dark:text-rose-400">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Empty State */}
      {items?.length === 0 && (
        <div className="app-panel flex flex-col items-center justify-center p-12 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-500/10 text-emerald-500 dark:bg-emerald-500/20">
            <CalendarX className="h-10 w-10" />
          </div>
          <h3 className="mt-6 text-xl font-bold text-slate-900 dark:text-white">Bạn chưa có lịch thay pin nào</h3>
          <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
            Hãy đặt lịch thay pin ngay để tiết kiệm thời gian chờ đợi và nhận hỗ trợ nhanh nhất tại các trạm đổi pin.
          </p>
          <Link to="/app/bookings/new" className="mt-6">
            <Button className="inline-flex items-center gap-2 px-6 py-2.5">
              <span>Đặt lịch ngay</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      )}

      {/* Bookings List */}
      <div className="grid gap-4">
        {items?.map((item) => {
          const statusObj = getBookingStatusLabel(item.status);
          const dateString = item.scheduledStart
            ? new Date(item.scheduledStart).toLocaleString('vi-VN', {
                weekday: 'short',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })
            : 'Chưa xác định thời gian';

          return (
            <Link
              key={item.id}
              to={`/app/bookings/${item.id}`}
              className="group relative rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-500/40 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/90 dark:hover:border-emerald-500/40"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${statusObj.color}`}>
                      {statusObj.label}
                    </span>
                    {item.mandatory && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-3 py-1 text-xs font-extrabold text-rose-600 dark:text-rose-400">
                        <AlertTriangle className="h-3 w-3" />
                        Thay pin bắt buộc (Ưu tiên {item.priority})
                      </span>
                    )}
                  </div>

                  <h2 className="text-lg font-bold text-slate-900 transition-colors group-hover:text-emerald-600 dark:text-white dark:group-hover:text-emerald-400 flex items-center gap-2">
                    <MapPin className="h-4 w-4 shrink-0 text-emerald-500" />
                    <span>{item.station?.name ?? item.stationName}</span>
                  </h2>

                  <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Car className="h-3.5 w-3.5 text-slate-400" />
                      <span>{item.vehicle?.name ?? 'Xe điện'}</span>
                      {item.vehicle?.plateNumber && (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {item.vehicle.plateNumber}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      <span>{dateString}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 sm:self-center">
                  <span>Chi tiết</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
