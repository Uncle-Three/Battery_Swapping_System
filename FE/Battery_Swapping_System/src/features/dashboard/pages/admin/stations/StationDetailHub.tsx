import { useCallback, useEffect, useState, type FC } from 'react';
import { NavLink, Outlet, useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Battery, BookOpen, CalendarClock, Edit3, Gauge, Loader2, Power, PowerOff, Users } from 'lucide-react';
import { Badge } from '../../../../../components/ui/Badge';
import { Button } from '../../../../../components/ui/Button';
import { Modal } from '../../../../../components/ui/Modal';
import { ApiClientError, getApiErrorMessage } from '../../../../../services/apiClient';
import { stationDetailService } from '../../../../../services/stationDetailService';
import type { Station } from '../../../../../types';
import { stationStatusLabel } from './stationStatusLabels';

export type StationDetailContext = { station: Station; reloadStation: () => Promise<void> };
const tabs = [
  ['Tổng quan', 'overview', Gauge], ['Khoang thay pin', 'bays-slots', CalendarClock], ['Kho pin trạm', 'inventory', Battery],
  ['Lịch đặt chỗ', 'bookings', BookOpen], ['Nhân sự & Phân công', 'staff', Users],
] as const;

export const StationDetailHub: FC = () => {
  const { stationId } = useParams(); const navigate = useNavigate();
  const [station, setStation] = useState<Station | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [status, setStatus] = useState<number>(); const [confirm, setConfirm] = useState(false); const [saving, setSaving] = useState(false);
  const load = useCallback(async () => { if (!stationId) return; try { setLoading(true); setError(''); setStation(await stationDetailService.get(stationId)); } catch (reason) { setStatus(reason instanceof ApiClientError ? reason.status : undefined); setError(getApiErrorMessage(reason, 'Không thể tải thông tin trạm.')); } finally { setLoading(false); } }, [stationId]);
  useEffect(() => { void load(); }, [load]);
  const changeStatus = async () => { if (!station || !stationId) return; try { setSaving(true); setStation(await stationDetailService.updateStatus(stationId, station.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE')); setConfirm(false); } catch (reason) { setError(getApiErrorMessage(reason)); } finally { setSaving(false); } };
  if (loading) return <div className="grid min-h-[480px] place-items-center"><div className="text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-600" /><p className="mt-3 text-sm font-bold text-slate-500">Đang tải thông tin trạm…</p></div></div>;
  if (!station) return <div className="mx-auto max-w-xl rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center text-rose-700"><AlertCircle className="mx-auto h-9 w-9" /><h1 className="mt-3 text-xl font-extrabold">{status === 403 ? 'Không có quyền truy cập' : status === 404 ? 'Không tìm thấy trạm' : 'Không thể tải trạm'}</h1><p className="mt-2 text-sm font-medium">{error}</p><Button className="mt-5" variant="outline" onClick={() => navigate('/admin/stations')}>Về danh sách trạm</Button></div>;
  return <div className="mx-auto max-w-[1600px] space-y-5">
    <button onClick={() => navigate('/admin/stations')} className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-emerald-600"><ArrowLeft className="h-4 w-4" />Trạm đổi pin / {station.code}</button>
    <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-center"><div><div className="flex flex-wrap items-center gap-3"><h1 className="text-2xl font-extrabold">{station.name}</h1><Badge variant={station.status === 'ACTIVE' ? 'success' : station.status === 'MAINTENANCE' ? 'warning' : 'gray'}>{stationStatusLabel(station.status)}</Badge></div><p className="mt-2 text-sm font-semibold text-slate-500">{station.code} · {station.address}</p><div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-xs font-bold text-slate-600 dark:text-slate-300"><span>Giờ hoạt động: {station.openingTime || '—'} – {station.closingTime || '—'}</span><span>Số khoang: {station.serviceBaysCount ?? 0}</span></div></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => navigate(`/admin/stations/${station.id}/edit`)}><Edit3 className="h-4 w-4" />Sửa trạm</Button><Button variant={station.status === 'ACTIVE' ? 'danger' : 'primary'} onClick={() => setConfirm(true)}>{station.status === 'ACTIVE' ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}{station.status === 'ACTIVE' ? 'Ngừng hoạt động' : 'Kích hoạt'}</Button></div></div></header>
    <nav className="overflow-x-auto rounded-2xl border border-slate-200 bg-white px-3 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex min-w-max gap-1">{tabs.map(([label, path, Icon]) => <NavLink key={path} to={path} className={({ isActive }) => `flex items-center gap-2 border-b-2 px-3 py-4 text-xs font-extrabold transition ${isActive ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}><Icon className="h-4 w-4" />{label}</NavLink>)}</div></nav>
    <Outlet context={{ station, reloadStation: load } satisfies StationDetailContext} />
    <Modal isOpen={confirm} onClose={() => setConfirm(false)} title={station.status === 'ACTIVE' ? 'Ngừng hoạt động trạm?' : 'Kích hoạt trạm?'} footer={<><Button variant="outline" onClick={() => setConfirm(false)}>Hủy</Button><Button loading={saving} variant={station.status === 'ACTIVE' ? 'danger' : 'primary'} onClick={() => void changeStatus()}>Xác nhận</Button></>}><p className="text-sm font-medium">Trạng thái trạm sẽ được cập nhật và lưu vào hệ thống.</p></Modal>
  </div>;
};
