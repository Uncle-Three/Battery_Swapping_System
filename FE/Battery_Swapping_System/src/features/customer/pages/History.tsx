import { useEffect, useState, type FC } from 'react';
import { swapService } from '../../../services/swapService';
import type { SwapTransaction } from '../../../types';
import { getApiErrorMessage } from '../../../services/apiClient';
import { Table } from '../../../components/ui/Table';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { LoadingSpinner } from '../../../components/feedback/LoadingSpinner';
import { History as HistoryIcon, FileText, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { statusLabel } from '../../../utils/viLabels';

const METHOD_LABELS: Record<string, string> = {
  VNPAY: 'VNPay',
  WALLET: 'Ví điện tử',
  CASH: 'Tiền mặt',
};

const statusVariant = (status: string): 'success' | 'error' | 'warning' => {
  if (status === 'SUCCESS') return 'success';
  if (status === 'FAILED') return 'error';
  return 'warning';
};

export const History: FC = () => {
  const [swaps, setSwaps] = useState<SwapTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<SwapTransaction | null>(null);

  useEffect(() => {
    swapService.getSwapHistory()
      .then((data) => setSwaps(data))
      .catch((cause) => setError(getApiErrorMessage(cause)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner size="lg" label="Đang tải lịch sử đổi pin..." />;

  return (
    <div className="flex flex-col gap-6 text-left">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-green-50 p-2 text-green-600 dark:bg-green-950/30 dark:text-green-500">
          <HistoryIcon className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Lịch sử đổi pin
          </h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Lịch sử các lần đổi pin và hóa đơn chi tiết từ hệ thống.
          </p>
        </div>
      </div>

      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-red-700">{error}</p>}

      {swaps.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-500 dark:border-slate-700">
          Bạn chưa thực hiện lần đổi pin nào.
        </div>
      ) : (
        <Table headers={['Trạm đổi pin', 'Xe', 'Pin vào', 'Pin ra', 'Chi phí', 'Trạng thái', 'Thời gian', 'Thao tác']}>
          {swaps.map((swap) => (
            <tr key={swap.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40">
              <td className="px-4 py-4 font-semibold text-slate-800 dark:text-slate-100">
                {swap.station?.name ?? swap.stationName ?? '—'}
              </td>
              <td className="px-4 py-4 text-sm">
                {swap.vehicle ? `${swap.vehicle.name} · ${swap.vehicle.plateNumber}` : '—'}
              </td>
              <td className="px-4 py-4">
                <span className="font-semibold text-red-500">
                  {swap.batteryIn?.serialNumber ?? swap.batteryInId}
                </span>
                <span className="ml-1 text-xs text-slate-400">SoC {swap.batteryInSoc ?? swap.batteryIn?.soc ?? '—'}%</span>
              </td>
              <td className="px-4 py-4">
                <span className="font-semibold text-green-600 dark:text-green-400">
                  {swap.batteryOut?.serialNumber ?? swap.batteryOutId}
                </span>
                <span className="ml-1 text-xs text-slate-400">SoC {swap.batteryOutSoc ?? swap.batteryOut?.soc ?? '—'}%</span>
              </td>
              <td className="px-4 py-4 font-semibold">
                {swap.invoice
                  ? `${swap.invoice.amount.toLocaleString('vi-VN')} VND`
                  : swap.cost
                    ? `${swap.cost.toLocaleString('vi-VN')} VND`
                    : '—'}
              </td>
              <td className="px-4 py-4">
                <Badge variant={statusVariant(swap.status)}>{statusLabel(swap.status)}</Badge>
              </td>
              <td className="px-4 py-4 text-xs text-slate-500">
                {new Date(swap.createdAt).toLocaleString('vi-VN')}
              </td>
              <td className="px-4 py-4">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex items-center gap-1.5"
                  onClick={() => setSelected(swap)}
                >
                  <FileText className="h-3.5 w-3.5" />
                  Hóa đơn
                </Button>
              </td>
            </tr>
          ))}
        </Table>
      )}

      {selected && (
        <Modal
          isOpen
          onClose={() => setSelected(null)}
          title="Hóa đơn đổi pin"
          footer={
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setSelected(null)}>Đóng</Button>
              <Button variant="primary" onClick={() => window.print()}>In hóa đơn</Button>
            </div>
          }
        >
          <div className="flex flex-col gap-5 text-left text-sm">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-lg text-green-600">BATTERYSWAP CO.</h3>
                <span className="text-xs text-slate-400 font-mono">Mã giao dịch: {selected.id}</span>
              </div>
              {selected.invoice ? (
                <Badge variant={selected.invoice.status === 'PAID' ? 'success' : 'warning'}>
                  {selected.invoice.status === 'PAID' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                </Badge>
              ) : (
                <Badge variant="warning">Chưa có hóa đơn</Badge>
              )}
            </div>

            {/* Customer & Station */}
            <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 text-xs dark:bg-slate-800/40">
              <div>
                <span className="block font-semibold uppercase text-slate-400">Trạm dịch vụ</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">
                  {selected.station?.name ?? selected.stationName ?? '—'}
                </span>
                {selected.station?.address && (
                  <span className="block text-slate-500">{selected.station.address}</span>
                )}
              </div>
              <div>
                <span className="block font-semibold uppercase text-slate-400">Thời gian</span>
                <span className="font-medium">{new Date(selected.createdAt).toLocaleString('vi-VN')}</span>
              </div>
              {selected.vehicle && (
                <div className="col-span-2">
                  <span className="block font-semibold uppercase text-slate-400">Xe điện</span>
                  <span className="font-semibold">{selected.vehicle.name} · {selected.vehicle.plateNumber}</span>
                </div>
              )}
            </div>

            {/* Battery info */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-red-100 p-3 dark:border-red-900">
                <p className="text-xs font-semibold uppercase text-red-500">Pin tháo ra</p>
                <p className="font-mono font-bold">{selected.batteryIn?.serialNumber ?? selected.batteryInId}</p>
                <p className="text-xs text-slate-500">
                  SoC: {selected.batteryIn?.soc ?? selected.batteryInSoc ?? '—'}%
                  {selected.batteryIn?.soh !== undefined && ` · SoH: ${selected.batteryIn.soh}%`}
                  {selected.batteryIn?.temperature !== undefined && ` · ${selected.batteryIn.temperature}°C`}
                </p>
              </div>
              <div className="rounded-xl border border-green-100 p-3 dark:border-green-900">
                <p className="text-xs font-semibold uppercase text-green-600">Pin lắp vào</p>
                <p className="font-mono font-bold">{selected.batteryOut?.serialNumber ?? selected.batteryOutId}</p>
                <p className="text-xs text-slate-500">
                  SoC: {selected.batteryOut?.soc ?? selected.batteryOutSoc ?? '—'}%
                  {selected.batteryOut?.soh !== undefined && ` · SoH: ${selected.batteryOut.soh}%`}
                </p>
              </div>
            </div>

            {/* Inspection */}
            {selected.inspection && (
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/40">
                <p className="mb-1 text-xs font-semibold uppercase text-slate-400">Kiểm tra pin cũ</p>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div><span className="text-slate-400">Tình trạng:</span> <span className="font-semibold">{statusLabel(selected.inspection.physicalCondition)}</span></div>
                  <div><span className="text-slate-400">Kết quả:</span> <span className="font-semibold">{statusLabel(selected.inspection.outcome)}</span></div>
                  {selected.inspection.notes && <div className="col-span-3"><span className="text-slate-400">Ghi chú:</span> {selected.inspection.notes}</div>}
                </div>
              </div>
            )}

            {/* Cost breakdown */}
            <div className="space-y-2 border-t border-slate-100 pt-3 dark:border-slate-800">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Chi tiết thanh toán</h4>
              {selected.payments && selected.payments.length > 0 ? (
                selected.payments.map((p) => (
                  <div key={p.id} className="flex justify-between text-xs">
                    <span className="text-slate-500">{METHOD_LABELS[p.paymentMethod] ?? p.paymentMethod}</span>
                    <span className="font-semibold">{p.amount.toLocaleString('vi-VN')} VND
                      <span className="ml-2 text-green-600">{statusLabel(p.status)}</span>
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400">Chưa có giao dịch thanh toán.</p>
              )}
              <div className="flex justify-between border-t border-slate-200 pt-2 font-bold text-base text-green-700 dark:border-slate-800 dark:text-green-400">
                <span>Tổng hóa đơn:</span>
                <span>
                  {selected.invoice
                    ? `${selected.invoice.amount.toLocaleString('vi-VN')} VND`
                    : selected.cost
                      ? `${selected.cost.toLocaleString('vi-VN')} VND`
                      : '—'}
                </span>
              </div>
            </div>

            {/* Status icons */}
            <div className="flex items-center justify-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
              {selected.status === 'SUCCESS' ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : selected.status === 'FAILED' ? (
                <XCircle className="h-5 w-5 text-red-600" />
              ) : (
                <Clock className="h-5 w-5 text-yellow-500" />
              )}
              <span className="text-xs font-semibold text-slate-500">
                Trạng thái giao dịch: {statusLabel(selected.status)} · {statusLabel(selected.workflowStatus)}
              </span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default History;
