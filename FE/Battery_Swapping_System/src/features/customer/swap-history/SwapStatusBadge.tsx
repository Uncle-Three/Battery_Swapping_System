import type { FC } from 'react';
import { SWAP_STATUS_LABELS } from './swapHistoryFormatters';
import type { SwapStatus } from './swapHistoryTypes';

const styles: Record<SwapStatus, string> = {
  PENDING: 'border-amber-200 bg-amber-50 text-amber-700',
  IN_PROGRESS: 'border-blue-200 bg-blue-50 text-blue-700',
  COMPLETED: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  CANCELLED: 'border-slate-200 bg-slate-100 text-slate-600',
  FAILED: 'border-red-200 bg-red-50 text-red-700',
};

export const SwapStatusBadge: FC<{ status: SwapStatus }> = ({ status }) => (
  <span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${styles[status]}`}>
    {SWAP_STATUS_LABELS[status]}
  </span>
);
