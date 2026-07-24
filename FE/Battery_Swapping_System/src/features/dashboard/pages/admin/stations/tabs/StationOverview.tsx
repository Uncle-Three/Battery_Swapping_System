import { useEffect, useState, type FC } from 'react';
import { Link, useOutletContext, useParams } from 'react-router-dom';
import { AlertCircle, Battery, CalendarClock, CheckCircle2, Loader2, ShieldAlert, Users } from 'lucide-react';
import { getApiErrorMessage } from '../../../../../../services/apiClient';
import { stationOverviewService, type StationOverviewData } from '../../../../../../services/stationDetailService';
import type { StationDetailContext } from '../StationDetailHub';
import { stationStatusLabel } from '../stationStatusLabels';

export const StationOverview: FC = () => {
  const { stationId } = useParams(); const { station } = useOutletContext<StationDetailContext>(); const [data, setData] = useState<StationOverviewData>(); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  useEffect(() => { if (!stationId) return; stationOverviewService.get(stationId).then(setData).catch((e) => setError(getApiErrorMessage(e))).finally(() => setLoading(false)); }, [stationId]);
  if (loading) return <div className="grid min-h-72 place-items-center"><Loader2 className="h-7 w-7 animate-spin text-emerald-600" /></div>;
  if (!data) return <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm font-semibold text-rose-700"><AlertCircle className="mr-2 inline h-4 w-4" />{error}</div>;
  const cards = [
    ['Tổng khoang thay pin', data.totalBays, 'bays-slots', CalendarClock], ['Khoang sẵn sàng', data.availableBays, 'bays-slots', CheckCircle2], ['Khoang bảo trì', data.maintenanceBays, 'bays-slots', ShieldAlert],
    ['Tổng lịch hôm nay', data.totalSlotsToday, 'bays-slots', CalendarClock], ['Lịch còn chỗ', data.availableSlotsToday, 'bays-slots', CheckCircle2], ['Lịch đã đầy', data.fullSlotsToday, 'bays-slots', AlertCircle],
    ['Lịch thay pin hôm nay', data.todayBookings, 'bookings', CalendarClock], ['Pin thay thế sẵn sàng', data.availableBatteries, 'inventory', Battery], ['Pin đã giữ chỗ', data.reservedBatteries, 'inventory', Battery],
    ['Pin cần kiểm tra', data.inspectionBatteries, 'inventory', ShieldAlert], ['Pin đang bảo trì', data.maintenanceBatteries, 'inventory', ShieldAlert], ['Nhân sự được phân công', data.assignedStaffCount, 'staff', Users],
  ] as const;
  return <div className="space-y-5"><section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{cards.map(([label, value, path, Icon]) => <Link key={label} to={`../${path}`} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 dark:border-slate-800 dark:bg-slate-900"><Icon className="h-5 w-5 text-emerald-600" /><p className="mt-3 text-2xl font-extrabold">{value}</p><p className="mt-1 text-xs font-bold text-slate-500">{label}</p></Link>)}</section>
    <section className="grid gap-5 lg:grid-cols-2"><div className="rounded-2xl border bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><p className="text-xs font-extrabold uppercase text-slate-500">Quản lý trạm</p><p className="mt-3 text-lg font-extrabold">{data.manager?.fullName || 'Chưa phân công'}</p><p className="mt-1 text-sm text-slate-500">{data.manager?.email || 'Không có quản lý đang hoạt động'}</p></div><div className="rounded-2xl border bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><p className="text-xs font-extrabold uppercase text-slate-500">Cảnh báo tồn kho thấp</p><p className={`mt-3 text-3xl font-extrabold ${data.lowInventoryAlerts ? 'text-rose-600' : 'text-emerald-600'}`}>{data.lowInventoryAlerts}</p><p className="mt-1 text-sm text-slate-500">Dựa trên pin sẵn sàng và số khoang của {station.name}</p></div></section>
    <section className="rounded-2xl border bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><h2 className="font-extrabold">Lịch thay pin gần đây</h2>{data.recentBookings.length ? <div className="mt-3 divide-y dark:divide-slate-800">{data.recentBookings.map((item) => <div key={item.id} className="flex flex-col justify-between gap-2 py-3 text-sm sm:flex-row"><span className="font-bold">{item.user?.fullName} · {item.vehicle?.plateNumber || item.vehicle?.name || 'Chưa có xe'}</span><span className="font-semibold text-slate-500">{stationStatusLabel(item.status)} · {new Date(item.createdAt).toLocaleString('vi-VN')}</span></div>)}</div> : <p className="mt-4 text-sm font-semibold text-slate-500">Chưa có lịch thay pin tại trạm.</p>}</section>
  </div>;
};
