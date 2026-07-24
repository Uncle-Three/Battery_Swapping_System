import { Info } from 'lucide-react';
import type { FC } from 'react';
import type { ServiceBay } from '../../../services/stationDetailService';

const statusMeta: Record<ServiceBay['status'], { label: string; dot: string }> = {
  AVAILABLE: { label: 'Sẵn sàng', dot: 'bg-emerald-500' },
  IN_USE: { label: 'Đang sử dụng', dot: 'bg-blue-500' },
  MAINTENANCE: { label: 'Bảo trì', dot: 'bg-amber-500' },
  INACTIVE: { label: 'Ngừng hoạt động', dot: 'bg-rose-500' },
};

export const BaySelector: FC<{
  bays: ServiceBay[];
  value: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}> = ({ bays, value, onChange, disabled }) => {
  const selectable = bays.filter((bay) => bay.status !== 'INACTIVE');
  const allSelected =
    selectable.length > 0 && selectable.every((bay) => value.includes(bay.id));

  const toggleAll = () =>
    onChange(allSelected ? [] : selectable.map((bay) => bay.id));

  return (
    <div>
      <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-400">
        <input
          type="checkbox"
          checked={allSelected}
          disabled={disabled || !selectable.length}
          onChange={toggleAll}
          className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
        />
        Chọn tất cả khoang khả dụng
      </label>

      <div className="mt-3 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/60 p-1.5 dark:border-slate-700 dark:bg-slate-950/30">
        {bays.length ? (
          bays.map((bay) => {
            const meta = statusMeta[bay.status];
            const unavailable = bay.status === 'INACTIVE';
            return (
              <label
                key={bay.id}
                className={`flex items-center gap-3 rounded-lg px-2.5 py-2.5 transition ${
                  unavailable
                    ? 'cursor-not-allowed opacity-55'
                    : 'cursor-pointer hover:bg-white hover:shadow-sm dark:hover:bg-slate-800'
                }`}
              >
                <input
                  type="checkbox"
                  disabled={disabled || unavailable}
                  checked={value.includes(bay.id)}
                  onChange={() =>
                    onChange(
                      value.includes(bay.id)
                        ? value.filter((id) => id !== bay.id)
                        : [...value, bay.id],
                    )
                  }
                  className="h-4 w-4 shrink-0 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${meta.dot}`} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-mono text-xs font-black text-slate-800 dark:text-slate-100">
                    {bay.bayCode}
                  </span>
                  <span className="block truncate text-[11px] font-semibold text-slate-500">
                    {bay.bayName}
                  </span>
                </span>
                <span className="shrink-0 text-[10px] font-bold text-slate-500">{meta.label}</span>
              </label>
            );
          })
        ) : (
          <p className="p-5 text-center text-xs font-semibold text-slate-500">
            Trạm chưa có khoang đổi pin.
          </p>
        )}
      </div>

      <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-4 text-slate-500">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
        Khoang đang ngừng hoạt động không thể được chọn để tạo slot.
      </p>
    </div>
  );
};
