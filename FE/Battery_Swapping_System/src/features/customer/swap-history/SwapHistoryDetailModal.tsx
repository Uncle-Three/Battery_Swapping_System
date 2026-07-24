import { X } from 'lucide-react';
import { useEffect, useRef, type FC, type ReactNode } from 'react';
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  SWAP_STATUS_LABELS,
  formatCurrencyVND,
  formatPercent,
  formatSwapDateTime,
} from './swapHistoryFormatters';
import type { SwapHistoryBattery, SwapHistoryItem } from './swapHistoryTypes';

interface Props {
  swap: SwapHistoryItem | null;
  onClose: () => void;
}

const Value: FC<{ label: string; children: ReactNode; mono?: boolean }> = ({ label, children, mono }) => (
  <div>
    <dt className="text-xs font-medium text-slate-500">{label}</dt>
    <dd className={`mt-1 text-sm font-semibold text-slate-800 ${mono ? 'font-mono' : ''}`}>{children}</dd>
  </div>
);

const BatterySection: FC<{ title: string; battery: SwapHistoryBattery | null; empty: string; install?: boolean }> = ({
  title,
  battery,
  empty,
  install,
}) => (
  <section>
    <h3 className="mb-3 text-sm font-bold text-slate-900">{title}</h3>
    {battery ? (
      <dl className="grid gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-3">
        <Value label="Mã pin" mono>{battery.code}</Value>
        <Value label="Loại pin">{battery.batteryType ?? 'Chưa ghi nhận'}</Value>
        <Value label={`SOC khi ${install ? 'lắp' : 'tháo'}`}>{formatPercent(battery.soc)}</Value>
        <Value label={`SOH khi ${install ? 'lắp' : 'tháo'}`}>{formatPercent(battery.soh)}</Value>
        {install && <Value label="Thời gian lắp">{formatSwapDateTime(battery.recordedAt)}</Value>}
      </dl>
    ) : <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">{empty}</p>}
  </section>
);

export const SwapHistoryDetailModal: FC<Props> = ({ swap, onClose }) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!swap) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>('button, [href], input, select, [tabindex]:not([tabindex="-1"])'))
        .filter((element) => !element.hasAttribute('disabled'));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus();
    };
  }, [swap, onClose]);

  if (!swap) return null;
  const showFailure = swap.status === 'FAILED' || swap.status === 'CANCELLED';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="swap-detail-title" className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
          <div>
            <h2 id="swap-detail-title" className="text-lg font-bold text-slate-900">Chi tiết giao dịch đổi pin</h2>
            <p className="mt-1 font-mono text-sm text-slate-500">{swap.code}</p>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Đóng cửa sổ chi tiết" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-6 overflow-y-auto px-5 py-5 sm:px-6">
          <section>
            <h3 className="mb-3 text-sm font-bold text-slate-900">Thông tin chung</h3>
            <dl className="grid gap-4 rounded-xl border border-slate-200 p-4 sm:grid-cols-2 lg:grid-cols-4">
              <Value label="Mã giao dịch" mono>{swap.code}</Value>
              <Value label="Trạm đổi pin">{swap.station.name}</Value>
              <Value label="Xe">{swap.vehicle.model} · {swap.vehicle.licensePlate}</Value>
              <Value label="Nhân viên thực hiện">{swap.staffName ?? 'Chưa ghi nhận'}</Value>
              <Value label="Thời gian bắt đầu">{formatSwapDateTime(swap.startedAt)}</Value>
              <Value label="Thời gian hoàn tất">{formatSwapDateTime(swap.completedAt)}</Value>
              <Value label="Trạng thái">{SWAP_STATUS_LABELS[swap.status]}</Value>
            </dl>
          </section>
          <BatterySection title="Pin tháo ra" battery={swap.oldBattery} empty="Chưa tháo pin" />
          <BatterySection title="Pin lắp vào" battery={swap.replacementBattery} empty="Chưa lắp pin" install />
          <section>
            <h3 className="mb-3 text-sm font-bold text-slate-900">Thanh toán</h3>
            <dl className="grid gap-4 rounded-xl border border-slate-200 p-4 sm:grid-cols-2 lg:grid-cols-4">
              <Value label="Phí dịch vụ">{formatCurrencyVND(swap.amount)}</Value>
              <Value label="Giảm giá">{formatCurrencyVND(swap.discountAmount)}</Value>
              <Value label="Tổng tiền">{formatCurrencyVND(swap.finalAmount)}</Value>
              <Value label="Trạng thái thanh toán">{PAYMENT_STATUS_LABELS[swap.paymentStatus]}</Value>
              <Value label="Phương thức">{swap.paymentMethod ? PAYMENT_METHOD_LABELS[swap.paymentMethod] ?? swap.paymentMethod : 'Chưa ghi nhận'}</Value>
              <Value label="Mã thanh toán" mono>{swap.paymentCode ?? 'Chưa ghi nhận'}</Value>
              <Value label="Mã hóa đơn" mono>{swap.invoiceId ?? 'Chưa phát hành'}</Value>
            </dl>
          </section>
          {showFailure && (
            <section className="rounded-xl border border-red-200 bg-red-50 p-4">
              <h3 className="text-sm font-bold text-red-800">{swap.status === 'FAILED' ? 'Thông tin thất bại' : 'Thông tin hủy giao dịch'}</h3>
              <dl className="mt-3 grid gap-4 sm:grid-cols-2">
                <Value label="Lý do">{swap.failureReason ?? swap.cancellationReason ?? 'Chưa ghi nhận lý do'}</Value>
                <Value label="Bước xảy ra">{swap.failedStep ?? 'Chưa ghi nhận'}</Value>
                <Value label="Thời gian">{formatSwapDateTime(swap.failedAt)}</Value>
              </dl>
            </section>
          )}
        </div>
        <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-5 py-4 sm:px-6">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500">Đóng</button>
        </div>
      </div>
    </div>
  );
};
