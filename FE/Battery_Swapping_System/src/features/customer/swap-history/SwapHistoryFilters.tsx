import { RotateCcw, Search } from 'lucide-react';
import type { FC } from 'react';
import type { SwapHistoryFiltersValue, SwapStatus } from './swapHistoryTypes';

interface Props {
  value: SwapHistoryFiltersValue;
  stations: Array<{ id: string; name: string }>;
  onChange: (value: SwapHistoryFiltersValue) => void;
  onReset: () => void;
}

const statusOptions: Array<{ value: SwapStatus | ''; label: string }> = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'PENDING', label: 'Chờ xử lý' },
  { value: 'IN_PROGRESS', label: 'Đang đổi pin' },
  { value: 'COMPLETED', label: 'Hoàn tất' },
  { value: 'CANCELLED', label: 'Đã hủy' },
  { value: 'FAILED', label: 'Thất bại' },
];

const inputClass = 'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100';

export const SwapHistoryFilters: FC<Props> = ({ value, stations, onChange, onReset }) => {
  const update = <K extends keyof SwapHistoryFiltersValue>(key: K, next: SwapHistoryFiltersValue[K]) =>
    onChange({ ...value, [key]: next });

  return (
    <section aria-label="Bộ lọc lịch sử đổi pin" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(250px,1.4fr)_1fr_1fr_1fr_1fr_auto]">
        <label className="relative">
          <span className="sr-only">Tìm theo mã giao dịch hoặc biển số xe</span>
          <Search aria-hidden className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
          <input
            className={`${inputClass} pl-9`}
            value={value.query}
            onChange={(event) => update('query', event.target.value)}
            placeholder="Mã giao dịch hoặc biển số xe"
          />
        </label>
        <label>
          <span className="sr-only">Trạng thái</span>
          <select className={inputClass} value={value.status} onChange={(event) => update('status', event.target.value as SwapStatus | '')}>
            {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label>
          <span className="sr-only">Trạm đổi pin</span>
          <select className={inputClass} value={value.stationId} onChange={(event) => update('stationId', event.target.value)}>
            <option value="">Tất cả trạm</option>
            {stations.map((station) => <option key={station.id} value={station.id}>{station.name}</option>)}
          </select>
        </label>
        <label>
          <span className="mb-1 block text-xs font-medium text-slate-500 xl:sr-only">Từ ngày</span>
          <input aria-label="Từ ngày" type="date" className={inputClass} value={value.fromDate} onChange={(event) => update('fromDate', event.target.value)} />
        </label>
        <label>
          <span className="mb-1 block text-xs font-medium text-slate-500 xl:sr-only">Đến ngày</span>
          <input aria-label="Đến ngày" type="date" className={inputClass} value={value.toDate} onChange={(event) => update('toDate', event.target.value)} />
        </label>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <RotateCcw aria-hidden className="h-4 w-4" />
          Đặt lại
        </button>
      </div>
    </section>
  );
};
