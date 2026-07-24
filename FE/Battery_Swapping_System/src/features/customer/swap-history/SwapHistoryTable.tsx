import { AlertCircle, Clock3, Eye } from 'lucide-react';
import type { FC } from 'react';
import { formatPercent, formatSwapDate, getCostDisplay } from './swapHistoryFormatters';
import { SwapStatusBadge } from './SwapStatusBadge';
import type { SwapHistoryItem } from './swapHistoryTypes';

interface Props {
  swaps: SwapHistoryItem[];
  onView: (swap: SwapHistoryItem) => void;
}

const BatteryCell: FC<{ battery: SwapHistoryItem['oldBattery']; empty: string; install?: boolean }> = ({ battery, empty, install }) => (
  battery ? (
    <div className="min-w-0">
      <p title={battery.code} className="truncate font-mono text-[11px] font-semibold text-slate-900">{battery.code}</p>
      <p className="mt-1 whitespace-nowrap text-[11px] text-slate-500">
        SOC {formatPercent(battery.soc)} <span aria-hidden className="text-slate-300">·</span> SOH {formatPercent(battery.soh)}
      </p>
      <span className="sr-only">Ghi nhận khi {install ? 'lắp pin' : 'tháo pin'}</span>
    </div>
  ) : <span className="text-sm text-slate-400">{empty}</span>
);

export const SwapHistoryTable: FC<Props> = ({ swaps, onView }) => (
  <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:block">
      <table className="w-full table-fixed text-left text-sm">
        <colgroup>
          <col className="w-[13%]" />
          <col className="w-[10%]" />
          <col className="w-[9%]" />
          <col className="w-[14%]" />
          <col className="w-[14%]" />
          <col className="w-[10%]" />
          <col className="w-[10%]" />
          <col className="w-[8%]" />
          <col className="w-[12%]" />
        </colgroup>
        <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            {['Mã giao dịch', 'Trạm', 'Xe', 'Pin tháo ra', 'Pin lắp vào', 'Chi phí', 'Trạng thái', 'Thời gian', 'Thao tác'].map((header) => (
              <th key={header} scope="col" className="px-3 py-3.5 font-semibold">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {swaps.map((swap) => {
            const date = formatSwapDate(swap.completedAt ?? swap.startedAt);
            const cost = getCostDisplay(swap);
            const failure = swap.status === 'FAILED';
            const progress = swap.status === 'IN_PROGRESS';
            return (
              <tr key={swap.id} className="align-top transition hover:bg-slate-50/70">
                <td className="px-3 py-4"><span title={swap.code} className="block truncate font-mono text-[11px] font-bold text-slate-900">{swap.code}</span></td>
                <td className="px-3 py-4">
                  <p title={swap.station.name} className="truncate font-semibold text-slate-800">{swap.station.name}</p>
                  {swap.station.shortAddress && <p className="mt-1 line-clamp-2 text-xs text-slate-500">{swap.station.shortAddress}</p>}
                </td>
                <td className="px-3 py-4">
                  <p title={swap.vehicle.model} className="truncate font-medium text-slate-800">{swap.vehicle.model}</p>
                  <p className="mt-1 whitespace-nowrap text-xs text-slate-500">{swap.vehicle.licensePlate}</p>
                </td>
                <td className="px-3 py-4"><BatteryCell battery={swap.oldBattery} empty="Chưa tháo pin" /></td>
                <td className="px-3 py-4"><BatteryCell battery={swap.replacementBattery} empty="Chưa lắp pin" install /></td>
                <td className="px-3 py-4">
                  <p className="text-sm font-semibold leading-5 text-slate-800">{cost.primary}</p>
                  {cost.secondary && <p className="mt-1 text-xs text-slate-500">{cost.secondary}</p>}
                </td>
                <td className="px-3 py-4"><SwapStatusBadge status={swap.status} /></td>
                <td className="px-3 py-4 text-xs text-slate-500">
                  <p className="font-medium text-slate-700">{date.time}</p>
                  <p className="mt-1">{date.date}</p>
                </td>
                <td className="px-3 py-4">
                  <div className="flex min-w-0 flex-col items-start gap-2">
                    <button type="button" onClick={() => onView(swap)} className="inline-flex items-start gap-1.5 text-left text-xs font-semibold leading-4 text-emerald-700 hover:text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                      {failure ? <AlertCircle className="h-3.5 w-3.5" /> : progress ? <Clock3 className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      {failure ? 'Xem lý do' : progress ? 'Theo dõi tiến trình' : 'Xem chi tiết'}
                    </button>
                    {swap.status === 'COMPLETED' && swap.paymentStatus === 'PENDING' && (
                      <span className="text-xs font-semibold text-amber-700">Thanh toán</span>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
  </div>
);
