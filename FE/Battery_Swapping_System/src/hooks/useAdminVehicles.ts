import { useCallback, useEffect, useState } from 'react';
import { getAdminVehicles } from '../services/adminVehicleApi';
import { getApiErrorMessage } from '../services/apiClient';
import type { AdminVehicleFilters, AdminVehicleListResponse } from '../types/adminVehicle';

export const useAdminVehicles = (filters: AdminVehicleFilters) => {
  const [data, setData] = useState<AdminVehicleListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => { setLoading(true); setError(null); try { setData(await getAdminVehicles(filters)); } catch (cause) { setError(getApiErrorMessage(cause, 'Không thể tải danh sách xe.')); } finally { setLoading(false); } }, [filters]);
  useEffect(() => { void refresh(); }, [refresh]);
  return { data, loading, error, refresh };
};
