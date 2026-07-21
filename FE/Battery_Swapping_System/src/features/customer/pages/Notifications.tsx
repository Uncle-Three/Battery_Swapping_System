import { useEffect, useState, type FC } from 'react';
import { Bell, BellOff, CheckCheck, Clock } from 'lucide-react';
import { notificationService } from '../../../services/notificationService';
import { getApiErrorMessage } from '../../../services/apiClient';
import { LoadingSpinner } from '../../../components/feedback/LoadingSpinner';
import { Button } from '../../../components/ui/Button';
import type { Notification } from '../../../types';

const TYPE_LABELS: Record<string, string> = {
  BOOKING_UPDATE: 'Cập nhật đặt lịch',
  PAYMENT_UPDATE: 'Thanh toán',
  BATTERY_SAFETY: 'An toàn pin',
  GENERAL: 'Thông báo',
  SYSTEM: 'Hệ thống',
};

const TYPE_COLORS: Record<string, string> = {
  BOOKING_UPDATE: 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300',
  PAYMENT_UPDATE: 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-300',
  BATTERY_SAFETY: 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300',
  GENERAL: 'bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  SYSTEM: 'bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-300',
};

export const Notifications: FC = () => {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [marking, setMarking] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError('');
    notificationService.getAll()
      .then(setItems)
      .catch((cause) => setError(getApiErrorMessage(cause)))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleMarkRead = async (id: string) => {
    setMarking(id);
    try {
      const updated = await notificationService.markRead(id);
      setItems((prev) => prev.map((n) => n.id === id ? { ...n, status: updated.status, readAt: updated.readAt } : n));
    } catch (cause) {
      setError(getApiErrorMessage(cause));
    } finally {
      setMarking(null);
    }
  };

  const handleMarkAllRead = async () => {
    const unread = items.filter((n) => n.status === 'UNREAD');
    for (const n of unread) {
      try {
        await notificationService.markRead(n.id);
      } catch {
        // continue others
      }
    }
    load();
  };

  const unreadCount = items.filter((n) => n.status === 'UNREAD').length;

  if (loading) return <LoadingSpinner size="lg" label="Đang tải thông báo..." />;

  return (
    <div className="flex flex-col gap-6 text-left">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-blue-50 p-2 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400">
            <Bell className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              Thông báo
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {unreadCount > 0 ? `${unreadCount} thông báo chưa đọc` : 'Tất cả đã đọc'}
            </p>
          </div>
        </div>
        {unreadCount > 0 && (
          <Button
            id="btn-mark-all-read"
            variant="outline"
            size="sm"
            onClick={() => void handleMarkAllRead()}
            className="flex items-center gap-1.5"
          >
            <CheckCheck className="h-4 w-4" />
            Đánh dấu tất cả đã đọc
          </Button>
        )}
      </div>

      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-slate-300 p-12 text-center dark:border-slate-700">
          <BellOff className="h-12 w-12 text-slate-300 dark:text-slate-600" />
          <p className="text-slate-500 dark:text-slate-400">Bạn không có thông báo nào.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((n) => {
            const isUnread = n.status === 'UNREAD';
            const typeColor = TYPE_COLORS[n.type] ?? TYPE_COLORS.GENERAL;
            return (
              <div
                key={n.id}
                className={`relative rounded-2xl border p-5 transition-all ${
                  isUnread
                    ? 'border-blue-200 bg-blue-50/50 shadow-sm dark:border-blue-800 dark:bg-blue-950/10'
                    : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
                }`}
              >
                {/* Unread dot */}
                {isUnread && (
                  <span className="absolute right-5 top-5 h-2.5 w-2.5 rounded-full bg-blue-500" />
                )}

                <div className="flex items-start gap-4">
                  <div className="flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${typeColor}`}>
                        {TYPE_LABELS[n.type] ?? n.type}
                      </span>
                      {isUnread && (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                          Mới
                        </span>
                      )}
                    </div>
                    <p className={`font-semibold ${isUnread ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                      {n.title}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{n.message}</p>
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <Clock className="h-3 w-3" />
                      {new Date(n.createdAt).toLocaleString('vi-VN')}
                      {n.readAt && (
                        <span className="ml-2">· Đọc lúc {new Date(n.readAt).toLocaleString('vi-VN')}</span>
                      )}
                    </div>
                  </div>

                  {isUnread && (
                    <Button
                      id={`btn-mark-read-${n.id}`}
                      size="sm"
                      variant="outline"
                      loading={marking === n.id}
                      onClick={() => void handleMarkRead(n.id)}
                      className="shrink-0"
                    >
                      Đã đọc
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Notifications;
