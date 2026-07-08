import { useEffect, useState, type FC } from 'react';
import { swapService } from '../../../services/swapService';
import type { SwapTransaction } from '../../../types';
import { Table } from '../../../components/ui/Table';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { LoadingSpinner } from '../../../components/feedback/LoadingSpinner';
import { History as HistoryIcon, FileText, QrCode } from 'lucide-react';

export const History: FC = () => {
  const [swaps, setSwaps] = useState<SwapTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSwap, setSelectedSwap] = useState<SwapTransaction | null>(null);
  const [isOpenInvoice, setIsOpenInvoice] = useState(false);

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

  const handleOpenInvoice = (swap: SwapTransaction) => {
    setSelectedSwap(swap);
    setIsOpenInvoice(true);
  };

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
        <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-xl p-8 text-center text-slate-500">
          Bạn chưa thực hiện giao dịch đổi pin nào.
        </div>
      ) : (
        <Table headers={['Mã giao dịch', 'Trạm sạc', 'Pin vào (SoC)', 'Pin ra (SoC)', 'Chi phí', 'Thời gian', 'Thao tác']}>
          {swaps.map((swap) => (
            <tr key={swap.id} className="hover:bg-slate-55 dark:hover:bg-slate-800/40 transition-colors">
              <td className="px-6 py-4 font-mono text-xs">{swap.id}</td>
              <td className="px-6 py-4 font-semibold text-slate-800 dark:text-slate-100">{swap.stationName}</td>
              <td className="px-6 py-4">
                <span className="text-red-500 font-semibold">{swap.batteryInSoc}%</span>
              </td>
              <td className="px-6 py-4">
                <span className="text-green-600 dark:text-green-450 font-semibold">{swap.batteryOutSoc}%</span>
              </td>
              <td className="px-6 py-4 font-semibold">{swap.cost.toLocaleString()} VND</td>
              <td className="px-6 py-4 text-xs text-slate-500">
                {new Date(swap.createdAt).toLocaleString()}
              </td>
              <td className="px-6 py-4">
                <Button size="sm" variant="outline" className="flex items-center gap-1.5" onClick={() => handleOpenInvoice(swap)}>
                  <FileText className="h-3.5 w-3.5" />
                  <span>Hóa đơn</span>
                </Button>
              </td>
            </tr>
          ))}
        </Table>
      )}

      {selectedSwap && (
        <Modal
          isOpen={isOpenInvoice}
          onClose={() => setIsOpenInvoice(false)}
          title="Hóa đơn điện tử đổi pin"
          footer={
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsOpenInvoice(false)}>
                Đóng
              </Button>
              <Button variant="primary" onClick={() => window.print()}>
                In hóa đơn
              </Button>
            </div>
          }
        >
          <div className="flex flex-col gap-6 text-left text-sm font-sans">
            {/* Header bill */}
            <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="font-bold text-lg text-green-600">BATTERYSWAP CO.</h3>
                <span className="text-xs text-slate-400">Mã hóa đơn: {selectedSwap.id}</span>
              </div>
              <Badge variant="success">Đã thanh toán (PAID)</Badge>
            </div>

            {/* Details customer */}
            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl">
              <div>
                <span className="text-slate-450 uppercase block font-semibold">Khách hàng</span>
                <strong className="text-sm font-bold text-slate-800 dark:text-slate-100">{selectedSwap.userName}</strong>
              </div>
              <div>
                <span className="text-slate-450 uppercase block font-semibold">Thời gian</span>
                <span className="text-sm font-medium">{new Date(selectedSwap.createdAt).toLocaleString()}</span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-455 uppercase block font-semibold">Vận hành tại trạm</span>
                <span className="text-sm font-semibold">{selectedSwap.stationName}</span>
              </div>
            </div>

            {/* Cost breakdown */}
            <div className="flex flex-col gap-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-450 border-b border-slate-150 dark:border-slate-800 pb-1.5">
                Chi tiết dịch vụ
              </h4>
              <div className="flex justify-between items-center py-1">
                <div>
                  <span className="block font-semibold">Tháo dỡ pin cũ (SoC {selectedSwap.batteryInSoc}%)</span>
                  <span className="text-xs text-slate-500">Mã pin: {selectedSwap.batteryInId}</span>
                </div>
                <span>Free</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-850 pb-3">
                <div>
                  <span className="block font-semibold">Lắp ráp pin mới (SoC {selectedSwap.batteryOutSoc}%)</span>
                  <span className="text-xs text-slate-500">Mã pin: {selectedSwap.batteryOutId}</span>
                </div>
                <span>Free</span>
              </div>

              <div className="flex justify-between py-1">
                <span className="text-slate-500">Phí chu kỳ nạp xả:</span>
                <span className="font-semibold">{selectedSwap.cost.toLocaleString()} VND</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Thuế GTGT (VAT 10%):</span>
                <span className="font-semibold">0 VND (Đã gồm)</span>
              </div>
              <div className="flex justify-between font-bold text-base text-green-600 dark:text-green-400 border-t border-slate-200 dark:border-slate-800 pt-3">
                <span>Tổng chi phí ví:</span>
                <span>{selectedSwap.cost.toLocaleString()} VND</span>
              </div>
            </div>

            {/* Barcode/QR Mock */}
            <div className="flex flex-col items-center gap-1.5 pt-4 border-t border-slate-100 dark:border-slate-850">
              <QrCode className="h-16 w-16 text-slate-400" />
              <span className="text-[10px] text-slate-400 font-semibold tracking-widest uppercase">
                CONFIRMED BY RFID CARD INTERACTION
              </span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
export default History;
