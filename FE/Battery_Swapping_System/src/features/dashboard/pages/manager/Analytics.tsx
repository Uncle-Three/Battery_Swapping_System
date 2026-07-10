import { useEffect, useState, type FC } from 'react';
import { reportService } from '../../../../services/reportService';
import { LoadingSpinner } from '../../../../components/feedback/LoadingSpinner';
import { BarChart3, TrendingUp, DollarSign, RefreshCw, Zap } from 'lucide-react';

export const Analytics: FC = () => {
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Station breakdown mock
  const [stationStats] = useState([
    { id: 'st-1', name: 'Trạm Sạc GreenCharge Quận 1', swaps: 450, revenue: 20250000, efficiency: 98.2, status: 'ACTIVE' },
    { id: 'st-2', name: 'Trạm Sạc GreenCharge Quận 7', swaps: 380, revenue: 17100000, efficiency: 96.5, status: 'ACTIVE' },
    { id: 'st-3', name: 'Trạm Sạc GreenCharge Bình Thạnh', swaps: 290, revenue: 13050000, efficiency: 91.0, status: 'MAINTENANCE' },
    { id: 'st-4', name: 'Trạm Sạc GreenCharge Tân Bình', swaps: 120, revenue: 5400000, efficiency: 94.7, status: 'ACTIVE' },
  ]);

  useEffect(() => {
    setLoading(true);
    reportService.getAnalytics()
      .then((res) => {
        // Adjust values dynamically based on period
        let factor = 1;
        if (period === 'week') factor = 0.25;
        if (period === 'year') factor = 12;

        setData({
          totalSwaps: Math.round(res.totalSwaps * factor),
          activeUsers: Math.round(res.activeUsers * (factor > 1 ? 2.5 : factor)),
          revenue: Math.round(res.revenue * factor),
          stationEfficiency: res.stationEfficiency,
          monthlySwaps: res.monthlySwaps.map((m: any) => ({ ...m, swaps: Math.round(m.swaps * (factor > 1 ? 1.5 : factor)) })),
        });
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching analytics:', err);
        setLoading(false);
      });
  }, [period]);

  if (loading) {
    return <LoadingSpinner size="lg" label="Đang tải dữ liệu phân tích..." />;
  }

  return (
    <div className="flex flex-col gap-6 text-left max-w-6xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            Thống kê Hiệu suất & Doanh thu
          </h2>
          <p className="text-sm text-slate-550 dark:text-slate-400 mt-1">
            Báo cáo số lượt đổi pin, tổng quan tài chính và chỉ số hoạt động hệ thống.
          </p>
        </div>

        {/* Period filter */}
        <div className="flex gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setPeriod('week')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              period === 'week' ? 'bg-white dark:bg-slate-900 text-green-600 shadow-sm' : 'text-slate-500'
            }`}
          >
            Tuần này
          </button>
          <button
            onClick={() => setPeriod('month')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              period === 'month' ? 'bg-white dark:bg-slate-900 text-green-600 shadow-sm' : 'text-slate-500'
            }`}
          >
            Tháng này
          </button>
          <button
            onClick={() => setPeriod('year')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              period === 'year' ? 'bg-white dark:bg-slate-900 text-green-600 shadow-sm' : 'text-slate-500'
            }`}
          >
            Năm nay
          </button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex justify-between items-center text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase">Số lượt đổi</span>
            <RefreshCw className="h-5 w-5 text-green-600" />
          </div>
          <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            {data?.totalSwaps.toLocaleString()}
          </h3>
          <p className="text-xs text-green-650 dark:text-green-400 font-bold mt-1">Tăng trưởng ổn định</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex justify-between items-center text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase">Doanh thu</span>
            <DollarSign className="h-5 w-5 text-green-600" />
          </div>
          <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            {data?.revenue.toLocaleString()} VND
          </h3>
          <p className="text-xs text-green-650 dark:text-green-400 font-bold mt-1">Nạp ví & gói dịch vụ</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex justify-between items-center text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase">Thành viên mới</span>
            <TrendingUp className="h-5 w-5 text-green-600" />
          </div>
          <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            {data?.activeUsers}
          </h3>
          <p className="text-xs text-green-655 dark:text-green-400 font-bold mt-1">Tỷ lệ tương tác cao</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex justify-between items-center text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase">Hiệu suất trạm</span>
            <Zap className="h-5 w-5 text-green-600" />
          </div>
          <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            {data?.stationEfficiency}%
          </h3>
          <p className="text-xs text-slate-400 mt-1">Đạt chỉ tiêu vận hành tối ưu</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Swaps graph chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl p-6 shadow-sm">
          <h3 className="font-bold text-sm text-slate-700 dark:text-slate-350 uppercase tracking-wider mb-6 flex items-center gap-1.5">
            <BarChart3 className="h-5 w-5 text-slate-400" />
            <span>Biểu đồ lượng giao dịch đổi pin</span>
          </h3>
          <div className="h-60 flex items-end gap-3 pt-6 border-b border-l border-slate-200 dark:border-slate-800 pl-4 pb-1">
            {data?.monthlySwaps.map((item: any) => {
              const maxSwaps = period === 'year' ? 800 : period === 'week' ? 120 : 500;
              const percentage = Math.min((item.swaps / maxSwaps) * 100, 100);
              return (
                <div key={item.month} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                  <div
                    style={{ height: `${percentage}%` }}
                    className="w-full bg-gradient-to-t from-green-500 to-green-650 hover:from-green-650 hover:to-green-700 rounded-t-md transition-all relative group cursor-pointer"
                  >
                    <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity font-bold">
                      {item.swaps}
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-500">{item.month}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Station statistics breakdown */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl p-6 shadow-sm flex flex-col gap-4">
          <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Sản lượng theo trạm
          </h3>

          <div className="flex flex-col gap-4 overflow-y-auto max-h-60">
            {stationStats.map((st) => (
              <div key={st.id} className="flex justify-between items-center border-b border-slate-100 dark:border-slate-850 pb-2.5">
                <div>
                  <span className="text-xs font-bold block text-slate-800 dark:text-slate-100 truncate max-w-[150px]">{st.name}</span>
                  <span className="text-[10px] text-slate-400 font-semibold">{st.swaps} lượt đổi</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-green-600 block">{st.revenue.toLocaleString()} VND</span>
                  <span className="text-[10px] text-slate-550 block font-semibold">{st.efficiency}% Uptime</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
export default Analytics;
