import { AlertCircle, Clock3, Eye } from 'lucide-react';
import type { FC } from 'react';
import { formatPercent, formatSwapDate, getCostDisplay } from './swapHistoryFormatters';
import { SwapStatusBadge } from './SwapStatusBadge';
import type { SwapHistoryItem } from './swapHistoryTypes';

interface Props {
  swap: SwapHistoryItem;
  onView: (swap: SwapHistoryItem) => void;
}

const BatteryBlock: FC<{ label: string; battery: SwapHistoryItem['oldBattery']; empty: string; install?: boolean }> = ({
  label,
  battery,
  empty,
  install,
}) => (
  <div className="rounded-xl bg-slate-50 p-3">
    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
    {battery ? (
      <>
        <p className="mt-1 break-all font-mono text-xs font-semibold text-slate-900">{battery.code}</p>
        <p className="mt-1 text-xs text-slate-500">
          SOC {install ? 'khi lắp' : 'khi tháo'}: {formatPercent(battery.soc)} · SOH: {formatPercent(battery.soh)}
        </p>
      </>
    ) : <p className="mt-2 text-sm text-slate-400">{empty}</p>}
  </div>
);

export const SwapHistoryMobileCard: FC<Props> = ({ swap, onView }) => {
  const date = formatSwapDate(swap.completedAt ?? swap.startedAt);
  const cost = getCostDisplay(swap);
  const failure = swap.status === 'FAILED';
  const progress = swap.status === 'IN_PROGRESS';

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-sm font-bold text-slate-900">{swap.code}</p>
          <p className="mt-1 text-sm font-semibold text-slate-700">{swap.station.name}</p>
        </div>
        <SwapStatusBadge status={swap.status} />
      </div>
      <div className="mt-3 flex items-center justify-between border-y border-slate-100 py-3 text-sm">
        <div>
          <p className="font-medium text-slate-800">{swap.vehicle.model}</p>
          <p className="text-slate-500">{swap.vehicle.licensePlate}</p>
        </div>
        <div className="text-right">
          <p className="font-semibold text-slate-800">{cost.primary}</p>
          {cost.secondary && <p className="text-xs text-slate-500">{cost.secondary}</p>}
        </div>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <BatteryBlock label="Pin tháo ra" battery={swap.oldBattery} empty="Chưa tháo pin" />
        <BatteryBlock label="Pin lắp vào" battery={swap.replacementBattery} empty="Chưa lắp pin" install />
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500">{date.time} · {date.date}</p>
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" onClick={() => onView(swap)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500">
            {failure ? <AlertCircle className="h-3.5 w-3.5" /> : progress ? <Clock3 className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {failure ? 'Xem lý do' : progress ? 'Theo dõi tiến trình' : 'Xem chi tiết'}
          </button>
        </div>
      </div>
    </article>
  );
};
