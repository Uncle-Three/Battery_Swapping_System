import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { History, ArrowRight, Car, User, Clock } from 'lucide-react';
import { swapService, type StaffSwap } from '../../../../services/swapService';
import { getApiErrorMessage } from '../../../../services/apiClient';
import { LoadingSpinner } from '../../../../components/feedback/LoadingSpinner';
import { statusLabel } from '../../../../utils/viLabels';

export const StaffHistory = () => {
  const [items, setItems] = useState<StaffSwap[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    swapService
      .history()
      .then(setItems)
      .catch((cause) => setError(getApiErrorMessage(cause)));
  }, []);

  if (!items && !error) {
    return <LoadingSpinner label="Đang tải lịch sử nhân viên..." />;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      <div>
        <div className="eyebrow flex items-center gap-2 mb-1">
          <History className="h-4 w-4 text-emerald-500" />
          <span>Nhật ký giao dịch</span>
        </div>
        <h1 className="page-title">Lịch sử thay pin tại trạm</h1>
        <p className="page-description">Theo dõi lịch sử các ca thay pin đã thực hiện tại trạm.</p>
      </div>

      {error && (
        <div role="alert" className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-rose-600 dark:text-rose-400">
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {items?.length === 0 && (
        <div className="app-panel flex flex-col items-center justify-center p-12 text-center border-dashed">
          <History className="h-10 w-10 text-slate-400" />
          <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">Chưa có giao dịch tại trạm</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Các giao dịch thay pin đã hoàn thành sẽ xuất hiện tại đây.</p>
        </div>
      )}

      <div className="grid gap-4">
        {items?.map((item) => (
          <Link
            key={item.id}
            to={`/staff/swaps/${item.id}`}
            className="app-panel p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-500/40"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Car className="h-4 w-4 text-emerald-500" />
                  <strong className="text-base font-extrabold text-slate-900 dark:text-white">
                    {item.booking?.vehicle?.name} · {item.booking?.vehicle?.plateNumber}
                  </strong>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <User className="h-3.5 w-3.5 text-slate-400" />
                    {item.booking?.user.fullName}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    {new Date(item.createdAt).toLocaleString('vi-VN')}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                  {statusLabel(item.workflowStatus)}
                </span>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};
