import { useEffect, useState } from 'react';
import { reportService, type AnalyticsReport } from '../../../../services/reportService';
import { LoadingSpinner } from '../../../../components/feedback/LoadingSpinner';

export const Analytics = () => {
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month'); const [data, setData] = useState<AnalyticsReport | null>(null); const [error, setError] = useState('');
  useEffect(() => { setData(null); setError(''); reportService.getAnalytics(period).then(setData).catch((cause) => setError(cause instanceof Error ? cause.message : 'Không thể tải báo cáo')); }, [period]);
  if (!data && !error) return <LoadingSpinner size="lg" label="Đang tải báo cáo..." />;
  return <div className="max-w-6xl space-y-6 text-left">
    <div className="flex justify-between gap-4"><div><h2 className="text-2xl font-bold">Báo cáo vận hành</h2><p className="text-sm text-slate-500">Dữ liệu tổng hợp trực tiếp từ MongoDB và giới hạn theo trạm được phân công.</p></div><select className="rounded-lg border p-2" value={period} onChange={(e) => setPeriod(e.target.value as typeof period)}><option value="week">7 ngày</option><option value="month">30 ngày</option><option value="year">1 năm</option></select></div>
    {error && <p className="bg-red-50 p-3 text-red-700">{error}</p>}
    {data && <><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[
      ['Lượt thay pin hoàn tất', data.totalSwaps.toLocaleString('vi-VN')], ['Doanh thu', `${data.revenue.toLocaleString('vi-VN')} VND`], ['Thời gian trung bình', `${data.averageReplacementMinutes} phút`], ['Yêu cầu bắt buộc đang mở', data.mandatoryOpen.toString()],
    ].map(([label, value]) => <div key={label} className="rounded-xl border bg-white p-5 dark:bg-slate-900"><p className="text-xs uppercase text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></div>)}</div>
    <div className="grid gap-4 lg:grid-cols-2"><div className="rounded-xl border bg-white p-5 dark:bg-slate-900"><h3 className="mb-3 font-bold">Chỉ số chất lượng</h3><p>Tỷ lệ duyệt: {data.approvalRate.toFixed(1)}%</p><p>Tỷ lệ thất bại hoặc hoàn tác: {data.failureRate.toFixed(1)}%</p><p>Pin an toàn / cảnh báo / không an toàn: {data.batterySafety.SAFE ?? 0}/{data.batterySafety.WARNING ?? 0}/{data.batterySafety.UNSAFE ?? 0}</p></div><div className="rounded-xl border bg-white p-5 dark:bg-slate-900"><h3 className="mb-3 font-bold">Hiệu suất theo trạm</h3>{data.stationStats.map((station) => <div key={station.id} className="flex justify-between border-b py-2 text-sm"><span>{station.name}</span><span>{station.swaps} lượt thay pin · {station.revenue.toLocaleString('vi-VN')} VND</span></div>)}</div></div></>}
  </div>;
};
export default Analytics;
