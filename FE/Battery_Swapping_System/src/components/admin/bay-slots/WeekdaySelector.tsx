import type { FC } from 'react';

const weekdays = [
  { value: 1, label: 'T2' },
  { value: 2, label: 'T3' },
  { value: 3, label: 'T4' },
  { value: 4, label: 'T5' },
  { value: 5, label: 'T6' },
  { value: 6, label: 'T7' },
  { value: 0, label: 'CN' },
];

export const WeekdaySelector: FC<{
  value: number[];
  onChange: (days: number[]) => void;
  disabled?: boolean;
}> = ({ value, onChange, disabled }) => (
  <div className="grid grid-cols-7 gap-1.5" role="group" aria-label="Ngày hoạt động">
    {weekdays.map((day) => {
      const selected = value.includes(day.value);
      return (
        <button
          key={day.value}
          type="button"
          disabled={disabled}
          aria-pressed={selected}
          onClick={() =>
            onChange(
              selected
                ? value.filter((item) => item !== day.value)
                : [...value, day.value],
            )
          }
          className={`min-h-9 rounded-lg border text-xs font-extrabold transition ${
            selected
              ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm'
              : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:bg-emerald-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
          }`}
        >
          {day.label}
        </button>
      );
    })}
  </div>
);
