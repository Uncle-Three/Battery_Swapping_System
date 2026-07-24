import { useCallback, useEffect, useState } from 'react';
import { getAdminVehicleDetail } from '../services/adminVehicleApi';
import { getApiErrorMessage } from '../services/apiClient';
import type { AdminVehicleDetail } from '../types/adminVehicle';

export const useAdminVehicleDetail = (id: string) => {
  const [data, setData] = useState<AdminVehicleDetail | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => { setLoading(true); setError(null); try { setData(await getAdminVehicleDetail(id)); } catch (cause) { setError(getApiErrorMessage(cause, 'Không thể tải thông tin xe.')); } finally { setLoading(false); } }, [id]);
  useEffect(() => { void refresh(); }, [refresh]); return { data, loading, error, refresh };
};
