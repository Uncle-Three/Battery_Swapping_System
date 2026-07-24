import { useEffect, useState, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { vehicleService } from '../../../services/vehicleService';
import { LoadingSpinner } from '../../../components/feedback/LoadingSpinner';
import { VehicleCard } from '../../../components/vehicles/VehicleCard';
import { AddVehicleDialog } from '../../../components/vehicles/AddVehicleDialog';
import type { Vehicle, PagedResponse } from '../../../types/vehicle';
import { PlusCircle, RefreshCw, Search } from 'lucide-react';

export const Vehicles = () => {
  const location = useLocation();
  const [vehiclesData, setVehiclesData] = useState<PagedResponse<Vehicle> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  useEffect(() => {
    if (location.state?.openAddModal) {
      setIsAddModalOpen(true);
    }
  }, [location.state]);

  const fetchVehicles = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await vehicleService.getMyVehicles();
      setVehiclesData(data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Không thể tải danh sách xe');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  const activeCount = vehiclesData?.content.filter(v => v.status === 'ACTIVE').length || 0;
  const needsAttentionCount = vehiclesData?.content.filter(v => {
    if (!v.currentBattery) return false;
    const hc = v.currentBattery.healthClassification;
    return hc === 'UNSAFE' || hc === 'REPLACEMENT_REQUIRED' || v.currentBattery.status === 'QUARANTINED';
  }).length || 0;

  if (loading && !vehiclesData) return <LoadingSpinner label="Đang tải danh sách xe..." />;

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white">Danh sách Xe</h1>
          <p className="text-sm text-slate-500 mt-1">Quản lý xe điện và tình trạng pin của bạn</p>
          
          {vehiclesData && (
            <div className="mt-4 flex gap-3 text-sm font-semibold flex-wrap">
              <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-700 dark:text-slate-300">
                {vehiclesData.totalElements} Xe
              </span>
              <span className="px-3 py-1 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full border border-green-200 dark:border-green-800">
                {activeCount} Hoạt động
              </span>
              {needsAttentionCount > 0 && (
                <span className="px-3 py-1 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full border border-red-200 dark:border-red-800">
                  {needsAttentionCount} Cần kiểm tra
                </span>
              )}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-3 flex-wrap">
          <button 
            onClick={fetchVehicles} 
            className="p-2.5 rounded-xl border hover:bg-slate-50 text-slate-600 dark:text-slate-300 dark:hover:bg-slate-800 transition"
            title="Làm mới danh sách"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Link
            to="/app/vehicles/add"
            className="px-4 py-2.5 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-700 font-bold flex items-center gap-2 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-900/50 transition"
          >
            <Search className="w-4 h-4" />
            Tra cứu & Chuyển xe cũ
          </Link>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold flex items-center gap-2 hover:bg-blue-700 transition"
          >
            <PlusCircle className="w-5 h-5" />
            Thêm Xe Mới
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-2xl border border-red-200 font-medium">
          {error}
        </div>
      )}

      {vehiclesData?.content.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center text-center bg-slate-50 dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-full shadow-sm mb-4">
            <PlusCircle className="w-10 h-10 text-slate-400" />
          </div>
          <h3 className="text-xl font-bold mb-2">Chưa có xe nào được đăng ký</h3>
          <p className="text-slate-500 max-w-md mb-6">
            Thêm xe điện của bạn để quản lý pin, xem tình trạng và đặt lịch đổi pin.
          </p>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition"
          >
            Thêm xe đầu tiên của bạn
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {vehiclesData?.content.map((vehicle) => (
            <VehicleCard key={vehicle.id} vehicle={vehicle} />
          ))}
        </div>
      )}

      {isAddModalOpen && (
        <AddVehicleDialog 
          onClose={() => setIsAddModalOpen(false)} 
          onSuccess={() => {
            setIsAddModalOpen(false);
            fetchVehicles();
          }} 
        />
      )}
    </div>
  );
};
