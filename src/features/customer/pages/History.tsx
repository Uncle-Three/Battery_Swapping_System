import { useEffect, useState, type FC } from 'react';
import { swapService } from '../../../services/swapService';
import type { SwapTransaction } from '../../../types';
import { Table } from '../../../components/ui/Table';
import { Badge } from '../../../components/ui/Badge';
import { LoadingSpinner } from '../../../components/feedback/LoadingSpinner';
import { History as HistoryIcon } from 'lucide-react';

export const History: FC = () => {
  const [swaps, setSwaps] = useState<SwapTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    swapService.getSwapHistory()
      .then((data) => {
        setSwaps(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching swaps:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <LoadingSpinner size="lg" label="Đang tải lịch sử giao dịch..." />;
  }

  return (
    <div className="flex flex-col gap-6 text-left">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-500 rounded-lg">
          <HistoryIcon className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Lịch sử giao dịch & Đổi pin
          </h1>
          <p className="text-sm text-slate-550 dark:text-slate-400 mt-0.5">
            Xem lịch sử các lần đổi pin và hóa đơn chi tiết của bạn trên hệ thống.
          </p>
        </div>
      </div>

      {swaps.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center text-slate-505">
          Bạn chưa thực hiện giao dịch đổi pin nào.
        </div>
      ) : (
        <Table headers={['Mã giao dịch', 'Trạm sạc', 'Pin vào (SoC)', 'Pin ra (SoC)', 'Chi phí', 'Thời gian', 'Trạng thái']}>
          {swaps.map((swap) => (
            <tr key={swap.id} className="hover:bg-slate-55 dark:hover:bg-slate-800/40 transition-colors">
              <td className="px-6 py-4 font-mono text-xs">{swap.id}</td>
              <td className="px-6 py-4 font-medium">{swap.stationName}</td>
              <td className="px-6 py-4">
                <span className="text-red-500 font-semibold">{swap.batteryInSoc}%</span>
              </td>
              <td className="px-6 py-4">
                <span className="text-green-600 dark:text-green-450 font-semibold">{swap.batteryOutSoc}%</span>
              </td>
              <td className="px-6 py-4 font-semibold">{swap.cost.toLocaleString()} VND</td>
              <td className="px-6 py-4 text-slate-500">
                {new Date(swap.createdAt).toLocaleString()}
              </td>
              <td className="px-6 py-4">
                <Badge variant={swap.status === 'SUCCESS' ? 'success' : 'error'}>
                  {swap.status === 'SUCCESS' ? 'Thành công' : 'Thất bại'}
                </Badge>
              </td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
};
export default History;
