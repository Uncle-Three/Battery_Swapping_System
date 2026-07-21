import { useEffect, useMemo, useState } from 'react';
import { Clock3, MapPin, UserRound, Warehouse } from 'lucide-react';
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
    swapService.context().then((data) => {
      setStations(data.stations);
      setStationId(data.stations[0]?.id ?? '');
      setActiveSwap(data.activeSwap);
    }).catch((cause) => setError(getApiErrorMessage(cause)));
  }, []);

  const selectBayBooking = async (bookingId: string) => {
    setLoading(true); setError(''); setBooking(null);
    try { setBooking(await swapService.lookup(bookingId, stationId)); }
    catch (cause) { setError(getApiErrorMessage(cause)); }
    finally { setLoading(false); }
  };

  const checkIn = async () => {
    if (!booking?.serviceBayId) return;
    setLoading(true); setError('');
    try {
      const swap = await swapService.checkIn(booking.id, stationId, booking.serviceBayId);
      navigate(`/staff/swaps/${swap.id}`);
    } catch (cause) { setError(getApiErrorMessage(cause)); } finally { setLoading(false); }
  };

  return <div className="max-w-5xl space-y-6">
    <header><h1 className="text-3xl font-black">Chọn khoang có khách để thay pin</h1><p className="mt-1 text-slate-500">Chỉ những khoang có lịch đã được duyệt mới xuất hiện. Nhân viên chọn đúng khoang đang có khách để bắt đầu kiểm tra xe và pin.</p></header>
    {!stations.length && !error && <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">Bạn chưa được phân công vào trạm đang hoạt động.</p>}
    {activeSwap && <div className="rounded-2xl border-2 border-blue-500 bg-blue-50 p-6 shadow-sm">
      <h2 className="text-lg font-black text-blue-900">Tiếp tục công việc đang dang dở</h2>
      <p className="mt-2 text-sm font-semibold text-blue-800">Bạn đang có quá trình thay pin đang thực hiện tại khoang <strong>{activeSwap.booking?.serviceBay?.bayCode}</strong>. Vui lòng hoàn tất quá trình này trước khi tiếp nhận xe khác.</p>
      <Button className="mt-4" onClick={() => navigate(`/staff/swaps/${activeSwap.id}`)}>Tiếp tục quá trình thay pin</Button>
    </div>}
    {selectedStation && <section data-testid="assigned-station" className="rounded-2xl border bg-white p-5">
      <p className="text-sm font-semibold text-slate-500">Trạm được phân công</p>
      <div className="mt-2 flex items-center gap-3"><div className="rounded-xl bg-emerald-50 p-2 text-emerald-700"><Warehouse className="h-5 w-5" /></div><div><p className="font-black">{selectedStation.name}</p><p className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-500"><MapPin className="h-4 w-4" />{selectedStation.address}</p></div></div>
      <p className="mt-3 rounded-lg bg-slate-50 p-2.5 text-xs font-semibold text-slate-600">Trạm này do quản trị viên phân công. Nhân viên không thể tự thay đổi.</p>
    </section>}
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
    {selectedStation && <section className="space-y-3"><div className="flex items-end justify-between"><div><h2 className="text-xl font-black">Khoang đang có khách</h2><p className="text-sm text-slate-500">{occupiedBays.length} khoang sẵn sàng tiếp nhận kiểm tra</p></div></div>
      {!occupiedBays.length ? <div className="rounded-2xl border border-dashed bg-slate-50 p-10 text-center"><Warehouse className="mx-auto h-9 w-9 text-slate-400" /><p className="mt-3 font-bold">Hiện chưa có khoang nào có khách đã được duyệt</p><p className="mt-1 text-sm text-slate-500">Khoang sẽ xuất hiện tại đây sau khi quản trị viên hoặc quản lý duyệt lịch.</p></div> : <div className="grid gap-4 md:grid-cols-2">{occupiedBays.flatMap((bay) => bay.bookings.map((waitingBooking) => <article key={waitingBooking.id} className={`rounded-2xl border bg-white p-5 shadow-sm ${booking?.id === waitingBooking.id ? 'border-emerald-500 ring-2 ring-emerald-100' : 'border-slate-200'}`}>
        <div className="flex items-start justify-between gap-3"><div><p className="font-mono text-xs font-black text-emerald-700">{bay.bayCode}</p><h3 className="text-lg font-black">{bay.bayName}</h3></div><span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">Có khách chờ</span></div>
        <div className="mt-4 space-y-2 text-sm"><p className="flex items-center gap-2"><UserRound className="h-4 w-4 text-slate-400" /><strong>{waitingBooking.user.fullName}</strong></p><p>Xe: <strong>{waitingBooking.vehicle?.name} · {waitingBooking.vehicle?.plateNumber}</strong></p><p className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-slate-400" />{waitingBooking.scheduledStart ? new Date(waitingBooking.scheduledStart).toLocaleString('vi-VN') : 'Chưa có thời gian'}</p></div>
        <Button className="mt-4 w-full justify-center" variant={booking?.id === waitingBooking.id ? 'secondary' : 'primary'} loading={loading && !booking} onClick={() => void selectBayBooking(waitingBooking.id)} disabled={!!activeSwap}>{booking?.id === waitingBooking.id ? 'Đã chọn khoang này' : 'Chọn khoang này'}</Button>
      </article>))}</div>}
    </section>}
    {booking && <section className="rounded-2xl border border-blue-200 bg-blue-50/50 p-6"><h2 className="text-xl font-black">Xác nhận khách và xe</h2><div className="mt-4 grid gap-3 sm:grid-cols-2"><p>Khách hàng: <strong>{booking.user.fullName}</strong></p><p>Số điện thoại: <strong>{booking.user.phone || 'Chưa cập nhật'}</strong></p><p>Xe: <strong>{booking.vehicle?.name} · {booking.vehicle?.plateNumber}</strong></p><p>Loại pin: <strong>{booking.vehicle?.batteryType || 'Chưa xác định'}</strong></p><p>Khoang: <strong>{booking.serviceBay?.bayCode} · {booking.serviceBay?.bayName}</strong></p><p>Pin đã giữ: <strong>{booking.battery?.serialNumber ?? 'Chọn sau khi kiểm tra'}</strong></p></div><p className="mt-4 rounded-xl bg-white p-3 text-sm text-blue-900">Khoang này đang được lịch của khách giữ và chỉ được giải phóng khi quy trình hoàn thành hoặc bị hủy.</p><Button className="mt-4" loading={loading} onClick={() => void checkIn()}>Đã xác minh khách đã đến trạm</Button></section>}
  </div>;
};

export default VerifyCustomer;
