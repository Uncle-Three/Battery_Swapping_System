import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { managerBookingService, type ManagerBooking } from '../../../../services/managerBookingService';
import { getApiErrorMessage } from '../../../../services/apiClient';
import { LoadingSpinner } from '../../../../components/feedback/LoadingSpinner';
import { useAuth } from '../../../../hooks/useAuth';
import { UserRole } from '../../../../constants/roles';
import { stationStatusLabel } from '../admin/stations/stationStatusLabels';

export const BookingApproval = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === UserRole.ADMIN;
  const detailRoot = isAdmin ? '/admin/booking-approvals' : '/manager/approvals';
  const [tab, setTab] = useState<'PENDING' | 'HISTORY'>('PENDING');
  const [items, setItems] = useState<ManagerBooking[] | null>(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('ALL');
  
  const load = useCallback(() => {
    setItems(null); setError('');
    const promise = tab === 'PENDING' ? managerBookingService.pending() : managerBookingService.history();
    promise.then(setItems).catch((cause) => setError(getApiErrorMessage(cause)));
  }, [tab]);
  
  useEffect(() => { load(); }, [load]);
  const visible = useMemo(() => items?.filter((item) => filter === 'ALL' || (filter === 'MANDATORY' ? item.mandatory : item.priority > 0)) ?? [], [items, filter]);

  return <div className="space-y-5">
    <div><h1 className="text-3xl font-black">Duyệt lịch thay pin</h1><p className="text-slate-500">{isAdmin ? 'Hiển thị lịch chờ duyệt của tất cả trạm trong hệ thống.' : 'Chỉ hiển thị lịch thuộc trạm quản lý được phân công.'}</p></div>
    
    <div className="flex border-b border-slate-200">
      <button className={`px-4 py-3 font-bold border-b-2 ${tab === 'PENDING' ? 'border-green-600 text-green-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`} onClick={() => setTab('PENDING')}>Chờ duyệt</button>
      <button className={`px-4 py-3 font-bold border-b-2 ${tab === 'HISTORY' ? 'border-green-600 text-green-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`} onClick={() => setTab('HISTORY')}>Lịch sử</button>
    </div>

    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
    {!items && !error && <LoadingSpinner label="Đang tải dữ liệu..." />}
    
    {items && (
      <>
        <div className="flex gap-2">{[['ALL', 'Tất cả'], ['MANDATORY', 'Bắt buộc'], ['PRIORITY', 'Ưu tiên']].map(([value, label]) => <button key={value} className={`rounded-lg px-4 py-2 text-sm font-bold ${filter === value ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-900' : 'bg-white border dark:bg-slate-900 dark:border-slate-800'}`} onClick={() => setFilter(value)}>{label}</button>)}</div>
        <div className="grid gap-4">{visible.map((item) => <Link to={`${detailRoot}/${item.id}`} key={item.id} className="rounded-2xl border bg-white p-5 hover:border-green-400 dark:bg-slate-900 dark:border-slate-800"><div className="flex flex-wrap justify-between gap-2"><div><h2 className="font-black">{item.user?.fullName ?? item.user?.email ?? 'Khách hàng'}</h2><p className="text-sm">{item.vehicle ? `${item.vehicle.name ?? ''} ${item.vehicle.plateNumber ? `· ${item.vehicle.plateNumber}` : ''} ${item.vehicle.batteryType ? `· ${item.vehicle.batteryType}` : ''}`.trim() : 'Chưa có thông tin xe'}</p><p className="text-sm text-slate-500">{item.station?.name ?? 'Trạm thay pin'} · {item.scheduledStart ? new Date(item.scheduledStart).toLocaleString('vi-VN') : '-'}</p></div><div className="text-right"><span className={`rounded-full px-3 py-1 text-xs font-bold ${item.status === 'PENDING_APPROVAL' ? 'bg-amber-100 text-amber-700' : item.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>{stationStatusLabel(item.status)}</span>{item.mandatory && <p className="mt-2 font-bold text-red-700">Bắt buộc · P{item.priority ?? 0}</p>}</div></div></Link>)}</div>
        {visible.length === 0 && <p className="rounded-xl border bg-white p-8 text-center dark:bg-slate-900 dark:border-slate-800">Không có lịch phù hợp bộ lọc.</p>}
      </>
    )}
  </div>;
};

export default BookingApproval;
