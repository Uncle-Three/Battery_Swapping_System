import { useCallback, useEffect, useState } from 'react';
import { notificationService } from '../services/notificationService';

const REFRESH_INTERVAL_MS = 30_000;

export const useUnreadNotifications = (enabled = true) => {
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setUnreadCount(0);
      return;
    }

    try {
      const notifications = await notificationService.getAll();
      setUnreadCount(notifications.filter((notification) => notification.status === 'UNREAD').length);
    } catch {
      // Keep the last known count when a background refresh temporarily fails.
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setUnreadCount(0);
      return;
    }

    void refresh();
    const intervalId = window.setInterval(() => void refresh(), REFRESH_INTERVAL_MS);
    const handleFocus = () => void refresh();
    const handleNotificationsUpdated = () => void refresh();

    window.addEventListener('focus', handleFocus);
    window.addEventListener('notifications-updated', handleNotificationsUpdated);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('notifications-updated', handleNotificationsUpdated);
    };
  }, [enabled, refresh]);

  return unreadCount;
};
