import { useEffect, useState, type FC } from 'react';
import { BarChart3, BatteryCharging, CircleDollarSign, Users } from 'lucide-react';
import { LoadingSpinner } from '../../../../components/feedback/LoadingSpinner';
import { reportService, type AnalyticsReport, type InventoryReport } from '../../../../services/reportService';
import { getApiErrorMessage } from '../../../../services/apiClient';
import { statusLabel } from '../../../../utils/viLabels';

export const AdminReports: FC = () => {
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [analytics, setAnalytics] = useState<AnalyticsReport | null>(null);
  const [inventory, setInventory] = useState<InventoryReport | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setAnalytics(null);
    setInventory(null);
    setError('');
    Promise.all([reportService.getAnalytics(period), reportService.getInventory()])
      .then(([analyticsData, inventoryData]) => {
        setAnalytics(analyticsData);
        setInventory(inventoryData);
      })
      .catch((cause) => setError(getApiErrorMessage(cause, 'Không thể tải báo cáo hệ thống.')));
  }, [period]);

  if (!analytics && !inventory && !error) return <LoadingSpinner size="lg" label="Đang tải báo cáo hệ thống..." />;

  const cards = analytics && inventory ? [
    { label: 'Lượt thay pin hoàn tất', value: analytics.totalSwaps.toLocaleString('vi-VN'), icon: BarChart3 },
    { label: 'Doanh thu', value: `${analytics.revenue.toLocaleString('vi-VN')} VND`, icon: CircleDollarSign },
    { label: 'Người dùng hoạt động', value: analytics.activeUsers.toLocaleString('vi-VN'), icon: Users },
    { label: 'Tổng pin', value: inventory.totalBatteries.toLocaleString('vi-VN'), icon: BatteryCharging },
  ] : [];

  return <div className="max-w-6xl space-y-6 text-left">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><h2 className="text-2xl font-bold text-slate-900 dark:text-white">Báo cáo toàn hệ thống</h2><p className="mt-1 text-sm text-slate-500">Dữ liệu trực tiếp từ MongoDB.</p></div><select className="rounded-lg border p-2 dark:bg-slate-900" value={period} onChange={(event) => setPeriod(event.target.value as typeof period)}><option value="week">7 ngày</option><option value="month">30 ngày</option><option value="year">1 năm</option></select></div>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
    {analytics && inventory && <>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(({ label, value, icon: Icon }) => <article key={label} className="rounded-2xl border bg-white p-5 dark:bg-slate-900"><Icon className="h-5 w-5 text-emerald-600" /><p className="mt-4 text-xs font-bold uppercase text-slate-500">{label}</p><p className="mt-2 text-2xl font-black">{value}</p></article>)}</section>
      <section className="grid gap-5 lg:grid-cols-2"><article className="rounded-2xl border bg-white p-5 dark:bg-slate-900"><h3 className="font-bold">Trạng thái lịch thay pin</h3><div className="mt-3 space-y-2">{Object.entries(analytics.bookingStatuses).map(([status, count]) => <div key={status} className="flex justify-between border-b py-2 text-sm"><span>{statusLabel(status)}</span><strong>{count}</strong></div>)}</div></article><article className="rounded-2xl border bg-white p-5 dark:bg-slate-900"><h3 className="font-bold">An toàn kho pin</h3><div className="mt-3 space-y-2">{Object.entries(inventory.bySafetyState).map(([state, count]) => <div key={state} className="flex justify-between border-b py-2 text-sm"><span>{statusLabel(state)}</span><strong>{count}</strong></div>)}</div></article></section>
      <section className="rounded-2xl border bg-white p-5 dark:bg-slate-900"><h3 className="font-bold">Hiệu suất theo trạm</h3><div className="mt-3 divide-y">{analytics.stationStats.map((station) => <div key={station.id} className="grid gap-2 py-3 text-sm sm:grid-cols-4"><strong>{station.name}</strong><span>{statusLabel(station.status)}</span><span>{station.swaps} lượt thay pin</span><span>{station.revenue.toLocaleString('vi-VN')} VND</span></div>)}</div></section>
    </>}
  </div>;
};

export default AdminReports;
