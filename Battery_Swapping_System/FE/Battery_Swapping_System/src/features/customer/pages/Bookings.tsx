import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { bookingService, type BookingDetail } from '../../../services/bookingService';
import { getApiErrorMessage } from '../../../services/apiClient';
import { LoadingSpinner } from '../../../components/feedback/LoadingSpinner';
import { Button } from '../../../components/ui/Button';
import { getBookingStatusLabel } from '../../../utils/bookingStatus';

export const Bookings = () => {
  const [items, setItems] = useState<BookingDetail[] | null>(null); const [error, setError] = useState('');
  useEffect(() => { bookingService.getAll().then(setItems).catch((cause) => setError(getApiErrorMessage(cause))); }, []);
  if (!items && !error) return <LoadingSpinner label="Đang tải lịch thay pin..." />;
  return <div className="space-y-6"><div className="flex items-center justify-between"><div><h1 className="text-3xl font-black">Lịch thay pin của tôi</h1><p className="text-slate-500">Theo dõi trạng thái và tiến trình xử lý.</p></div><Link to="/app/bookings/new"><Button>Đặt lịch mới</Button></Link></div>{error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}{items?.length === 0 && <p className="rounded-xl border bg-white p-8 text-center">Bạn chưa có lịch thay pin.</p>}<div className="grid gap-4">{items?.map((item) => {
    const statusObj = getBookingStatusLabel(item.status);
    return <Link key={item.id} to={`/app/bookings/${item.id}`} className="rounded-2xl border bg-white p-5 shadow-sm hover:border-green-400"><div className="flex flex-wrap items-start justify-between gap-2"><div><h2 className="font-black">{item.station?.name ?? item.stationName}</h2><p className="text-sm text-slate-500">{item.vehicle?.name} · {item.vehicle?.plateNumber}</p></div><span className={`h-fit rounded-full px-3 py-1 text-xs font-bold whitespace-nowrap ${statusObj.color}`}>{statusObj.label}</span></div><p className="mt-3 text-sm">{item.scheduledStart ? new Date(item.scheduledStart).toLocaleString('vi-VN') : 'Chưa có thời gian'}</p>{item.mandatory && <p className="mt-2 font-bold text-red-700">Thay pin bắt buộc · Ưu tiên {item.priority}</p>}</Link>;
  })}</div></div>;
};
