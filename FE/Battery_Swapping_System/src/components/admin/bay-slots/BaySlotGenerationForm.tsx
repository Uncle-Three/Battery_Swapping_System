import { CalendarRange, Clock3, Layers3, Plus } from 'lucide-react';
import type { FC } from 'react';
import { Button } from '../../ui/Button';
import type { ServiceBay } from '../../../services/stationDetailService';
import { BaySelector } from './BaySelector';
import type { SlotGenerationValues } from './types';
import { WeekdaySelector } from './WeekdaySelector';

const inputClass =
  'mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white';
const hourOptions = Array.from({ length: 25 }, (_, hour) => {
  const value = `${String(hour).padStart(2, '0')}:00`;
  return { value, label: value };
});

const localToday = () => {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
};

export const BaySlotGenerationForm: FC<{
  bays: ServiceBay[];
  values: SlotGenerationValues;
  onChange: (values: SlotGenerationValues) => void;
  onPreview?: () => void;
  onCreate: () => void;
  loading?: boolean;
  saving?: boolean;
  canCreate: boolean;
  error?: string;
  onRetry?: () => void;
}> = ({
  bays,
  values,
  onChange,
  onCreate,
  loading,
  saving,
  canCreate,
  error,
  onRetry,
}) => {
  const update = <K extends keyof SlotGenerationValues>(
    key: K,
    value: SlotGenerationValues[K],
  ) => onChange({ ...values, [key]: value });

  if (loading) {
    return (
      <section className="rounded-[18px] border border-emerald-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="space-y-4 animate-pulse">
          <div className="h-5 w-48 rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-3 w-full rounded bg-slate-100 dark:bg-slate-800" />
          {[1, 2, 3, 4, 5].map((item) => (
            <div key={item} className="h-14 rounded-xl bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-[18px] border border-emerald-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <header className="border-b border-slate-100 p-5 dark:border-slate-800">
        <h2 className="flex items-center gap-2 text-base font-black text-slate-900 dark:text-white">
          <span className="rounded-lg bg-emerald-100 p-2 text-emerald-700 dark:bg-emerald-950">
            <Layers3 className="h-4 w-4" />
          </span>
          Tạo khung giờ hàng loạt
        </h2>
        <p className="mt-2 text-xs leading-5 text-slate-500">
          Thiết lập thời gian, ngày áp dụng và các khoang để lưu slot trực tiếp vào hệ thống.
        </p>
      </header>

      <div className="space-y-5 p-5">
        {error && (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
            <p>{error}</p>
            {onRetry && (
              <button type="button" onClick={onRetry} className="mt-2 font-black underline">
                Thử lại
              </button>
            )}
          </div>
        )}

        <fieldset>
          <legend className="flex items-center gap-1.5 text-xs font-black text-slate-700 dark:text-slate-200">
            <CalendarRange className="h-3.5 w-3.5 text-emerald-600" /> Khoảng ngày
          </legend>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <label className="text-xs font-bold text-slate-500">
              Từ ngày
              <input type="date" min={localToday()} value={values.dateFrom} onChange={(event) => update('dateFrom', event.target.value)} className={inputClass} />
            </label>
            <label className="text-xs font-bold text-slate-500">
              Đến ngày
              <input type="date" min={values.dateFrom} value={values.dateTo} onChange={(event) => update('dateTo', event.target.value)} className={inputClass} />
            </label>
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-xs font-black text-slate-700 dark:text-slate-200">Ngày hoạt động</legend>
          <div className="mt-2"><WeekdaySelector value={values.daysOfWeek} onChange={(days) => update('daysOfWeek', days)} /></div>
        </fieldset>

        <fieldset>
          <legend className="flex items-center gap-1.5 text-xs font-black text-slate-700 dark:text-slate-200">
            <Clock3 className="h-3.5 w-3.5 text-emerald-600" /> Giờ hoạt động
          </legend>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <label className="text-xs font-bold text-slate-500">
              Giờ mở cửa
              <select
                value={values.openingTime}
                onChange={(event) => update('openingTime', event.target.value)}
                className={inputClass}
              >
                {hourOptions.slice(0, 24).map((hour) => (
                  <option key={hour.value} value={hour.value}>
                    {hour.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-bold text-slate-500">
              Giờ đóng cửa
              <select
                value={values.closingTime}
                onChange={(event) => update('closingTime', event.target.value)}
                className={inputClass}
              >
                {hourOptions.slice(1).map((hour) => (
                  <option key={hour.value} value={hour.value}>
                    {hour.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-xs font-black text-slate-700 dark:text-slate-200">Cấu hình slot</legend>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <label className="text-xs font-bold text-slate-500">
              Thời lượng mỗi slot
              <select value={values.slotDurationMinutes} onChange={(event) => update('slotDurationMinutes', Number(event.target.value))} className={inputClass}>
                {[30, 60].map((minutes) => <option key={minutes} value={minutes}>{minutes} phút</option>)}
              </select>
            </label>
            <label className="text-xs font-bold text-slate-500">
              Thời gian đệm
              <select value={values.bufferMinutes} onChange={(event) => update('bufferMinutes', Number(event.target.value))} className={inputClass}>
                <option value={0}>Không có</option>
                {[5, 10, 15].map((minutes) => <option key={minutes} value={minutes}>{minutes} phút</option>)}
              </select>
            </label>
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-xs font-black text-slate-700 dark:text-slate-200">Áp dụng cho khoang</legend>
          <BaySelector bays={bays} value={values.selectedBayIds} onChange={(ids) => update('selectedBayIds', ids)} />
        </fieldset>
      </div>

      <footer className="border-t border-slate-100 p-5 dark:border-slate-800">
        <Button type="button" className="w-full" loading={saving} disabled={!canCreate} onClick={onCreate}>
          <Plus className="h-4 w-4" /> Tạo & Lưu slot vào dữ liệu
        </Button>
      </footer>
    </section>
  );
};
