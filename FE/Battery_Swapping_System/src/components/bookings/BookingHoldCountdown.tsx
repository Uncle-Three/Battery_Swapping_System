import { useEffect, useState } from 'react';
import { Clock3 } from 'lucide-react';

const holdStatuses = new Set([
  'CREATED',
  'PENDING_APPROVAL',
  'APPROVED',
  'RESCHEDULE_PROPOSED',
  'RESCHEDULED',
]);

type BookingHoldCountdownProps = {
  expiryTime?: string;
  status: string;
  compact?: boolean;
};

const formatRemaining = (remainingMs: number) => {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes} phút ${String(seconds).padStart(2, '0')} giây`;
};

export const BookingHoldCountdown = ({
  expiryTime,
  status,
  compact = false,
}: BookingHoldCountdownProps) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!expiryTime || (!holdStatuses.has(status) && status !== 'EXPIRED')) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [expiryTime, status]);

  if (!expiryTime || (!holdStatuses.has(status) && status !== 'EXPIRED')) return null;

  const expiryTimestamp = new Date(expiryTime).getTime();
  if (Number.isNaN(expiryTimestamp)) return null;

  const remainingMs = expiryTimestamp - now;
  const expired = status === 'EXPIRED' || remainingMs <= 0;

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${expired ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'}`}>
        <Clock3 className="h-3.5 w-3.5" />
        {expired ? 'Đã hết thời gian giữ chỗ' : `Giữ chỗ còn ${formatRemaining(remainingMs)}`}
      </span>
    );
  }

  return (
    <div
      role={expired ? 'alert' : 'status'}
      className={`flex items-start gap-3 rounded-2xl border p-4 ${
        expired
          ? 'border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300'
          : 'border-amber-500/25 bg-amber-500/10 text-amber-800 dark:text-amber-300'
      }`}
    >
      <Clock3 className="mt-0.5 h-5 w-5 shrink-0" />
      <div>
        <p className="font-extrabold">
          {expired
            ? 'Đã hết thời gian giữ chỗ'
            : `Thời gian giữ chỗ còn ${formatRemaining(remainingMs)}`}
        </p>
        <p className="mt-1 text-sm font-medium">
          {expired
            ? 'Bạn chưa check-in trước khi hết thời gian giữ chỗ sau giờ hẹn, nên tài nguyên sẽ được giải phóng.'
            : `Chỗ được giữ đến ${new Date(expiryTimestamp).toLocaleString('vi-VN')}. Hãy check-in trước thời điểm này; lịch sẽ không hết hạn trước giờ hẹn.`}
        </p>
      </div>
    </div>
  );
};
