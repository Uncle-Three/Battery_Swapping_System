import { useEffect, useState, type FC } from 'react';
import { reportService } from '../../../../services/reportService';
import { LoadingSpinner } from '../../../../components/feedback/LoadingSpinner';
import { TrendingUp, DollarSign, RefreshCw, Zap } from 'lucide-react';

export const Analytics: FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reportService.getAnalytics()
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching analytics:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <LoadingSpinner size="lg" label="Đang tải dữ liệu phân tích..." />;
  }

  return (
    <div className="flex flex-col gap-6 text-left max-w-6xl">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
          Thống kê Hiệu suất & Doanh thu
        </h2>
        <p className="text-sm text-slate-550 dark:text-slate-400 mt-1">
          Báo cáo số lượt đổi pin, tổng quan tài chính và chỉ số hoạt động hệ thống.
        </p>
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
          <p className="text-xs text-green-650 dark:text-green-400 font-bold mt-1">+12% so với tháng trước</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex justify-between items-center text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase">Doanh thu</span>
            <DollarSign className="h-5 w-5 text-green-600" />
          </div>
          <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            {data?.revenue.toLocaleString()} VND
          </h3>
          <p className="text-xs text-green-650 dark:text-green-400 font-bold mt-1">+8.5% so với tháng trước</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex justify-between items-center text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase">Thành viên mới</span>
            <TrendingUp className="h-5 w-5 text-green-600" />
          </div>
          <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            {data?.activeUsers}
          </h3>
          <p className="text-xs text-green-655 dark:text-green-400 font-bold mt-1">+18.3% tỷ lệ giữ chân</p>
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

      {/* Mini Chart Mock */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
        <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-6">
          Biểu đồ số lượt đổi pin (Năm 2026)
        </h3>
        <div className="h-64 flex items-end gap-3 pt-6 border-b border-l border-slate-200 dark:border-slate-800 pl-4 pb-1">
          {data?.monthlySwaps.map((item: any) => {
            const percentage = (item.swaps / 500) * 100;
            return (
              <div key={item.month} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                <div
                  style={{ height: `${percentage}%` }}
                  className="w-full bg-gradient-to-t from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 rounded-t-md transition-all relative group cursor-pointer"
                >
                  <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity font-bold">
                    {item.swaps}
                  </span>
                </div>
                <span className="text-xs font-semibold text-slate-500">{item.month}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
