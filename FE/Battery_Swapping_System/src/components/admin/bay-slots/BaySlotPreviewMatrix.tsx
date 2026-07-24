import { CalendarDays, Info } from 'lucide-react';
import type { FC } from 'react';
import { Button } from '../../ui/Button';
import { BaySlotStatusBadge } from './BaySlotStatusBadge';
import { BaySlotSummary } from './BaySlotSummary';
import type { PreviewSlot } from './types';

const keyOf = (slot: Pick<PreviewSlot, 'bayId' | 'startTime' | 'endTime'>) =>
  `${slot.bayId}:${slot.startTime}:${slot.endTime}`;

export const BaySlotPreviewMatrix: FC<{
  slots: PreviewSlot[];
  previewDates?: string[];
  previewDate: string;
  onPreviewDateChange: (date: string) => void;
  loading?: boolean;
  error?: string;
  notice?: string;
  onRetry?: () => void;
  onSlotClick: (slot: PreviewSlot) => void;
}> = ({ slots, previewDates, previewDate, onPreviewDateChange, loading, error, notice, onRetry, onSlotClick }) => {
  const dateSlots = slots.filter((slot) => slot.date === previewDate);
  const ranges = Array.from(
    new Map(dateSlots.map((slot) => [`${slot.startTime}:${slot.endTime}`, { startTime: slot.startTime, endTime: slot.endTime }])).values(),
  );
  const bays = Array.from(
    new Map(dateSlots.map((slot) => [slot.bayId, { id: slot.bayId, code: slot.bayCode, name: slot.bayName }])).values(),
  );
  const slotMap = new Map(dateSlots.map((slot) => [keyOf(slot), slot]));
  const off = slots.filter((slot) => slot.status === 'OFF').length;
  const bayCount = new Set(slots.map((slot) => slot.bayId)).size;
  const dates = previewDates?.length
    ? previewDates
    : Array.from(new Set(slots.map((slot) => slot.date))).sort();

  const clickSlot = (slot: PreviewSlot) => {
    if (slot.status === 'AVAILABLE' || slot.status === 'OFF') {
      onSlotClick(slot);
      return;
    }
    if (slot.status === 'RESERVED' || slot.status === 'CHECKED_IN') {
      onSlotClick(slot);
      return;
    }
    if (slot.status === 'IN_PROGRESS' || slot.status === 'COMPLETED') {
      onSlotClick(slot);
    }
  };

  return (
    <section className="min-w-0 rounded-[18px] border border-emerald-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <header className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-start sm:justify-between dark:border-slate-800">
        <div>
          <h2 className="flex items-center gap-2 text-base font-black text-slate-900 dark:text-white">
            <span className="rounded-lg bg-emerald-100 p-2 text-emerald-700 dark:bg-emerald-950">
              <CalendarDays className="h-4 w-4" />
            </span>
            Danh sách khung giờ trạm
          </h2>
          <p className="mt-2 text-xs font-semibold text-slate-500">
            {previewDate
              ? new Date(`${previewDate}T12:00:00`).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })
              : 'Chưa chọn ngày'}
          </p>
        </div>
        {slots.length > 0 && <BaySlotSummary slots={slots.length} bays={bayCount} off={off} />}
      </header>

      {error && (
        <div role="alert" className="m-5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
          <p>{error}</p>
          {onRetry && <Button size="sm" variant="outline" className="mt-2" onClick={onRetry}>Thử lại</Button>}
        </div>
      )}
      {notice && (
        <div role="status" className="mx-5 mt-5 flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs font-semibold text-blue-700">
          <Info className="h-4 w-4 shrink-0" /> {notice}
        </div>
      )}

      {loading ? (
        <div className="space-y-3 p-5 animate-pulse">
          <div className="h-12 rounded-xl bg-slate-100 dark:bg-slate-800" />
          {[1, 2, 3, 4].map((item) => <div key={item} className="h-14 rounded-xl bg-slate-100 dark:bg-slate-800" />)}
        </div>
      ) : !slots.length ? (
        <div className="grid min-h-[460px] place-items-center p-8 text-center">
          <div>
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40">
              <CalendarDays className="h-7 w-7" />
            </span>
            <h3 className="mt-4 text-base font-black text-slate-800 dark:text-white">Chưa có khung giờ nào trong hệ thống</h3>
            <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-slate-500">
              Thiết lập thông tin ngày, giờ và bấm <strong>Tạo & Lưu slot</strong> để tạo lịch cho trạm.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="border-b border-slate-100 px-5 py-3 dark:border-slate-800">
            <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
              Ngày hiển thị
              <select
                aria-label="Ngày hiển thị"
                value={previewDate}
                onChange={(event) => onPreviewDateChange(event.target.value)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-semibold dark:border-slate-700 dark:bg-slate-800"
              >
                {dates.map((date) => (
                  <option key={date} value={date}>
                    {new Date(`${date}T12:00:00`).toLocaleDateString('vi-VN')}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {!dateSlots.length ? (
            <div className="grid min-h-[360px] place-items-center p-8 text-center">
              <div>
                <CalendarDays className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-3 text-sm font-bold text-slate-600 dark:text-slate-300">
                  Ngày này không có khung giờ
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Ngày chưa được chọn trong Ngày hoạt động hoặc chưa có slot phù hợp.
                </p>
              </div>
            </div>
          ) : <div className="max-h-[650px] overflow-auto">
            <table className="w-max min-w-full border-separate border-spacing-0 text-left">
              <thead className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-800">
                <tr>
                  <th className="sticky left-0 z-30 min-w-48 border-b border-r border-slate-200 bg-slate-50 px-4 py-3 text-xs font-black text-slate-600 dark:border-slate-700 dark:bg-slate-800">Khoang</th>
                  {ranges.map((range) => (
                    <th key={`${range.startTime}:${range.endTime}`} className="min-w-32 border-b border-slate-200 px-3 py-3 text-center text-xs font-black text-slate-600 dark:border-slate-700">
                      {range.startTime}–{range.endTime}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bays.map((bay) => (
                  <tr key={bay.id} className="group">
                    <th className="sticky left-0 z-10 border-b border-r border-slate-100 bg-white px-4 py-3 group-hover:bg-emerald-50/40 dark:border-slate-800 dark:bg-slate-900">
                      <span className="block font-mono text-xs font-black text-emerald-700 dark:text-emerald-400">{bay.code}</span>
                      <span className="mt-0.5 block max-w-40 truncate text-[11px] font-semibold text-slate-500">{bay.name}</span>
                    </th>
                    {ranges.map((range) => {
                      const slot = slotMap.get(`${bay.id}:${range.startTime}:${range.endTime}`);
                      return (
                        <td key={`${range.startTime}:${range.endTime}`} className="border-b border-slate-100 px-3 py-2.5 text-center dark:border-slate-800">
                          {slot ? <BaySlotStatusBadge status={slot.status} onClick={() => clickSlot(slot)} /> : <span className="text-slate-300">—</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>}
        </>
      )}
    </section>
  );
};
