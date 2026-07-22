import { useEffect, useMemo, useState } from 'react';
import { Clock3, MapPin, UserRound, Warehouse, AlertCircle, CheckCircle2, ArrowRight, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../../components/ui/Button';
import { swapService, type StaffBooking, type StaffStation, type StaffSwap } from '../../../../services/swapService';
import { getApiErrorMessage } from '../../../../services/apiClient';

export const VerifyCustomer = () => {
  const [stations, setStations] = useState<StaffStation[]>([]);
  const [activeSwap, setActiveSwap] = useState<StaffSwap | null>(null);
  const [stationId, setStationId] = useState('');
  const [booking, setBooking] = useState<StaffBooking | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const selectedStation = useMemo(() => stations.find((station) => station.id === stationId), [stations, stationId]);
  const occupiedBays = useMemo(() => selectedStation?.serviceBays.filter((bay) => bay.bookings.length > 0) ?? [], [selectedStation]);

  useEffect(() => {
    swapService
      .context()
      .then((data) => {
        setStations(data.stations);
        setStationId(data.stations[0]?.id ?? '');
        setActiveSwap(data.activeSwap);
      })
      .catch((cause) => setError(getApiErrorMessage(cause)));
  }, []);

  const selectBayBooking = async (bookingId: string) => {
    setLoading(true);
    setError('');
    setBooking(null);
    try {
      setBooking(await swapService.lookup(bookingId, stationId));
    } catch (cause) {
      setError(getApiErrorMessage(cause));
    } finally {
      setLoading(false);
    }
  };

  const checkIn = async () => {
    if (!booking?.serviceBayId) return;
    setLoading(true);
    setError('');
    try {
      const swap = await swapService.checkIn(booking.id, stationId, booking.serviceBayId);
      navigate(`/staff/swaps/${swap.id}`);
    } catch (cause) {
      setError(getApiErrorMessage(cause));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-12">
      {/* Page Header */}
      <div>
        <div className="eyebrow flex items-center gap-2 mb-1">
          <Warehouse className="h-4 w-4 text-emerald-500" />
          <span>Vận hành trạm đổi pin</span>
        </div>
        <h1 className="page-title">Chọn khoang có khách để thay pin</h1>
        <p className="page-description">
          Chỉ những khoang có lịch đã được duyệt mới xuất hiện. Nhân viên chọn đúng khoang đang có khách để bắt đầu kiểm tra xe và pin.
        </p>
      </div>

      {/* No Station Assigned Alert */}
      {!stations.length && !error && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-amber-700 dark:text-amber-400">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">Bạn chưa được phân công vào trạm đang hoạt động.</p>
        </div>
      )}

      {/* Active Swap Alert */}
      {activeSwap && (
        <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-6 dark:bg-blue-950/40">
          <div className="flex items-center gap-3 text-blue-700 dark:text-blue-400">
            <ShieldAlert className="h-6 w-6 shrink-0" />
            <h2 className="text-lg font-extrabold">Tiếp tục công việc đang dang dở</h2>
          </div>
          <p className="mt-2 text-sm text-blue-800 dark:text-blue-300">
            Bạn đang có quá trình thay pin đang thực hiện tại khoang <strong>{activeSwap.booking?.serviceBay?.bayCode}</strong>. Vui lòng hoàn tất quá trình này trước khi tiếp nhận xe khác.
          </p>
          <Button className="mt-4 inline-flex items-center gap-2" onClick={() => navigate(`/staff/swaps/${activeSwap.id}`)}>
            <span>Tiếp tục quá trình thay pin</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Assigned Station Information */}
      {selectedStation && (
        <section data-testid="assigned-station" className="app-panel p-6">
          <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">Trạm được phân công</p>
          <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500 dark:bg-emerald-500/20">
                <Warehouse className="h-6 w-6" />
              </div>
              <div>
                <p className="text-lg font-extrabold text-slate-900 dark:text-white">{selectedStation.name}</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                  <MapPin className="h-4 w-4 text-emerald-500" />
                  {selectedStation.address}
                </p>
              </div>
            </div>
            <span className="inline-flex items-center rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              Trạm phân công bởi Admin
            </span>
          </div>
        </section>
      )}

      {/* Error Alert */}
      {error && (
        <div role="alert" className="flex items-center gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-rose-600 dark:text-rose-400">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Occupied Bays Section */}
      {selectedStation && (
        <section className="space-y-4">
          <div className="flex items-end justify-between border-b border-slate-200/80 pb-3 dark:border-slate-800">
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">Khoang đang có khách</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">{occupiedBays.length} khoang sẵn sàng tiếp nhận kiểm tra</p>
            </div>
          </div>

          {!occupiedBays.length ? (
            <div className="app-panel flex flex-col items-center justify-center p-12 text-center border-dashed">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                <Warehouse className="h-8 w-8" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">Hiện chưa có khoang nào có khách đã được duyệt</h3>
              <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
                Khoang sẽ tự động xuất hiện tại đây sau khi quản trị viên hoặc quản lý duyệt lịch đặt của khách hàng.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {occupiedBays.flatMap((bay) =>
                bay.bookings.map((waitingBooking) => {
                  const isSelected = booking?.id === waitingBooking.id;
                  return (
                    <article
                      key={waitingBooking.id}
                      className={`app-panel p-6 transition-all duration-200 ${
                        isSelected
                          ? 'border-emerald-500 ring-2 ring-emerald-500/20 dark:bg-slate-900'
                          : 'hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="font-mono text-xs font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                            {bay.bayCode}
                          </span>
                          <h3 className="text-lg font-black text-slate-900 dark:text-white">{bay.bayName}</h3>
                        </div>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Có khách chờ
                        </span>
                      </div>

                      <div className="mt-4 space-y-2 rounded-xl bg-slate-50/80 p-4 text-sm text-slate-700 dark:bg-slate-800/50 dark:text-slate-300">
                        <div className="flex items-center gap-2">
                          <UserRound className="h-4 w-4 text-slate-400" />
                          <span>Khách hàng: <strong className="text-slate-900 dark:text-white">{waitingBooking.user.fullName}</strong></span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span>Xe: <strong className="text-slate-900 dark:text-white">{waitingBooking.vehicle?.name} · {waitingBooking.vehicle?.plateNumber}</strong></span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock3 className="h-4 w-4 text-slate-400" />
                          <span>{waitingBooking.scheduledStart ? new Date(waitingBooking.scheduledStart).toLocaleString('vi-VN') : 'Chưa có thời gian'}</span>
                        </div>
                      </div>

                      <Button
                        className="mt-4 w-full justify-center"
                        variant={isSelected ? 'secondary' : 'primary'}
                        loading={loading && !booking}
                        onClick={() => void selectBayBooking(waitingBooking.id)}
                        disabled={!!activeSwap}
                      >
                        {isSelected ? 'Đã chọn khoang này' : 'Chọn khoang này'}
                      </Button>
                    </article>
                  );
                }),
              )}
            </div>
          )}
        </section>
      )}

      {/* Booking Customer Verification Step */}
      {booking && (
        <section className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-6 dark:bg-blue-950/40 space-y-4">
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
            <CheckCircle2 className="h-6 w-6" />
            <h2 className="text-xl font-black">Xác nhận khách và xe tại trạm</h2>
          </div>

          <div className="grid gap-4 rounded-xl bg-white/80 p-5 text-sm text-slate-800 shadow-sm dark:bg-slate-900/80 dark:text-slate-200 sm:grid-cols-2">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Khách hàng</p>
              <p className="font-bold text-slate-900 dark:text-white">{booking.user.fullName}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Số điện thoại</p>
              <p className="font-bold text-slate-900 dark:text-white">{booking.user.phone || 'Chưa cập nhật'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Thông tin xe</p>
              <p className="font-bold text-slate-900 dark:text-white">{booking.vehicle?.name} · {booking.vehicle?.plateNumber}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Loại pin</p>
              <p className="font-bold text-slate-900 dark:text-white">{booking.vehicle?.batteryType || 'Chưa xác định'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Khoang phục vụ</p>
              <p className="font-bold text-slate-900 dark:text-white">{booking.serviceBay?.bayCode} · {booking.serviceBay?.bayName}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Pin đã giữ</p>
              <p className="font-bold text-slate-900 dark:text-white">{booking.battery?.serialNumber ?? 'Chọn sau khi kiểm tra'}</p>
            </div>
          </div>

          <p className="text-xs font-medium text-blue-700 dark:text-blue-300">
            Khoang này đang được giữ lịch của khách và sẽ chỉ được giải phóng sau khi quy trình thay pin hoàn thành hoặc bị hủy.
          </p>

          <Button className="w-full sm:w-auto inline-flex items-center justify-center gap-2" loading={loading} onClick={() => void checkIn()}>
            <CheckCircle2 className="h-4 w-4" />
            <span>Xác minh khách đã đến trạm & Bắt đầu thay pin</span>
          </Button>
        </section>
      )}
    </div>
  );
};

export default VerifyCustomer;
