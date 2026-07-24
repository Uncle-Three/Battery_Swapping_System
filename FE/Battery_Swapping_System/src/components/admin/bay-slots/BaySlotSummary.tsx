import type { FC } from 'react';
import { Badge } from '../../ui/Badge';

export const BaySlotSummary: FC<{ slots: number; bays: number; off: number }> = ({
  slots,
  bays,
  off,
}) => (
  <div className="flex flex-wrap items-center gap-2">
    <Badge variant="success" className="px-3 py-1">{slots} slot</Badge>
    <Badge variant="info" className="px-3 py-1">{bays} khoang</Badge>
    <Badge variant={off ? 'error' : 'gray'} className="px-3 py-1">{off} slot tắt</Badge>
  </div>
);
