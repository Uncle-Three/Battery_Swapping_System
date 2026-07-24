import type { FC } from 'react';
import type { SlotStatus } from './types';

const statusMeta: Record<SlotStatus, { label: string; classes: string }> = {
  AVAILABLE: { label: 'Còn trống', classes: 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300' },
  OFF: { label: 'Tắt slot', classes: 'border-dashed border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300' },
  RESERVED: { label: 'Đã đặt', classes: 'border-slate-300 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  BLOCKED: { label: 'Đã khóa', classes: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300' },
  CHECKED_IN: { label: 'Đã check-in', classes: 'border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-800 dark:bg-cyan-950/30 dark:text-cyan-300' },
  IN_PROGRESS: { label: 'Đang thực hiện', classes: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300' },
  COMPLETED: { label: 'Hoàn thành', classes: 'border-emerald-700 bg-emerald-700 text-white' },
  CANCELLED: { label: 'Đã hủy', classes: 'border-slate-200 bg-white text-slate-400 dark:border-slate-700 dark:bg-slate-900' },
  EXPIRED: { label: 'Đã qua giờ', classes: 'border-slate-700 bg-slate-700 text-white' },
};

export const BaySlotStatusBadge: FC<{
  status: SlotStatus;
  cooldownEndsAt?: string | null;
  nowMs?: number;
  onClick?: () => void;
}> = ({ status, cooldownEndsAt, nowMs = Date.now(), onClick }) => {
  const cooldownRemainingMs = status === 'COMPLETED' && cooldownEndsAt
    ? new Date(cooldownEndsAt).getTime() - nowMs
    : null;
  const isCoolingDown = cooldownRemainingMs !== null && cooldownRemainingMs > 0;
  const isReleased = cooldownRemainingMs !== null && cooldownRemainingMs <= 0;
  const meta = statusMeta[isReleased ? 'AVAILABLE' : status];
  const totalSeconds = Math.max(0, Math.ceil((cooldownRemainingMs ?? 0) / 1000));
  const countdown = `${String(Math.floor(totalSeconds / 60)).padStart(2, '0')}:${String(totalSeconds % 60).padStart(2, '0')}`;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-9 w-[108px] items-center justify-center rounded-lg border px-2 py-1.5 text-[11px] font-extrabold transition ${meta.classes} ${onClick ? 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/30' : 'cursor-default'}`}
    >
      {isCoolingDown ? `Đệm ${countdown}` : meta.label}
    </button>
  );
};
