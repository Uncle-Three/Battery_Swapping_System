import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { vehicleService } from '../../../services/vehicleService';
import { LoadingSpinner } from '../../../components/feedback/LoadingSpinner';
import { EditVehicleDialog } from '../../../components/vehicles/EditVehicleDialog';
import { UpdateMileageDialog } from '../../../components/vehicles/UpdateMileageDialog';
import { VehicleQrDialog } from '../../../components/vehicles/VehicleQrDialog';
import type { Vehicle } from '../../../types/vehicle';
import { ArrowLeft, Edit3, Gauge, QrCode, Power, PowerOff, Battery, AlertTriangle, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';

const extractBatteryCode = (code: string | undefined | null) => {
  if (!code) return 'Chưa có Pin';
  if (code.includes('batteryCode=')) {
    const match = code.match(/batteryCode=([^&]*)/);
    if (match && match[1]) return match[1];
  }
  return code.split('/').pop() || code;
};

export const VehicleDetail = () => {
  const { vehicleId = '' } = useParams();
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isMileageModalOpen, setIsMileageModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchVehicle = useCallback(async () => {
    setLoading(true);
    try {
      const data = await vehicleService.getVehicleById(vehicleId);
      setVehicle(data);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Không thể tải thông tin xe');
    } finally {
      setLoading(false);
    }
  }, [vehicleId]);

  useEffect(() => {
    fetchVehicle();
  }, [fetchVehicle]);

  const handleToggleStatus = async () => {
    const isSuspending = vehicle?.status !== 'SUSPENDED';
    const actionText = isSuspending ? 'tạm ngưng hoạt động' : 'kích hoạt lại';
    
    if (!window.confirm(`Bạn có chắc chắn muốn ${actionText} xe này không?`)) return;
    setIsDeleting(true);
    try {
      await vehicleService.updateVehicle(vehicleId, { 
        status: isSuspending ? 'SUSPENDED' : 'ACTIVE' 
      });
      fetchVehicle();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || "Cập nhật trạng thái thất bại");
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) return <LoadingSpinner label="Đang tải thông tin xe..." />;
  if (error) return <div role="alert" className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-200">{error}</div>;
  if (!vehicle) return null;

  const { currentBattery } = vehicle;
  const needsAttention = currentBattery && (currentBattery.healthClassification === "UNSAFE" || currentBattery.healthClassification === "REPLACEMENT_REQUIRED");

  return (
    <div className="space-y-6 w-full p-4 md:p-6 pb-20">
      <button onClick={() => navigate('/app/vehicles')} className="flex w-fit items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold transition-all shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800">
        <ArrowLeft className="w-4 h-4" /> Quay lại Danh sách Xe
      </button>

      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border shadow-sm">
        <div>
          <h1 className="text-3xl font-black">{vehicle.brand} {vehicle.model}</h1>
          <p className="text-lg text-slate-500 font-mono mt-1 font-semibold">{vehicle.plateNumber}</p>
          <div className="flex flex-wrap gap-2 mt-4">
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
              vehicle.status === 'ACTIVE' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
            }`}>
              {vehicle.status === 'ACTIVE' ? 'Hoạt động' : 'Không hoạt động'}
            </span>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <button onClick={() => setIsQrModalOpen(true)} className="px-4 py-2 border rounded-xl font-semibold flex items-center gap-2 hover:bg-slate-50 transition dark:hover:bg-slate-800">
            <QrCode className="w-4 h-4" /> Mã QR
          </button>
          <button onClick={() => setIsEditModalOpen(true)} className="px-4 py-2 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-xl font-semibold flex items-center gap-2 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition">
            <Edit3 className="w-4 h-4" /> Sửa
          </button>
          <button 
            onClick={handleToggleStatus} 
            disabled={isDeleting} 
            title={vehicle.status === 'SUSPENDED' ? 'Kích hoạt lại' : 'Ngưng hoạt động'}
            className={`p-2 border rounded-xl transition flex items-center gap-2 font-semibold disabled:opacity-50 ${
              vehicle.status === 'SUSPENDED' 
                ? 'border-green-200 text-green-600 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/40' 
                : 'border-orange-200 text-orange-600 bg-orange-50 hover:bg-orange-100 dark:bg-orange-900/20 dark:hover:bg-orange-900/40'
            }`}
          >
            {vehicle.status === 'SUSPENDED' ? <><Power className="w-4 h-4" /> Bật lại</> : <><PowerOff className="w-4 h-4" /> Tắt xe</>}
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-3xl border shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-500" /> Thông tin chung
            </h2>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">Mã số khung (VIN)</span>
              <span className="font-medium font-mono">{vehicle.vin || 'Không có'}</span>
            </div>
            <div className="flex justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">Năm sản xuất</span>
              <span className="font-medium">{vehicle.manufactureYear}</span>
            </div>
            <div className="flex justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">Ngày mua</span>
              <span className="font-medium">{vehicle.purchaseDate ? new Date(vehicle.purchaseDate).toLocaleDateString() : 'Không có'}</span>
            </div>
            <div className="flex justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">Màu sắc</span>
              <span className="font-medium">{vehicle.color || 'Không có'}</span>
            </div>
            <div className="flex justify-between pt-1 border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">Số Km đã đi (ODO)</span>
              <div className="flex items-center gap-3">
                <span className="font-bold">{vehicle.currentMileageKm.toLocaleString()} km</span>
                <button onClick={() => setIsMileageModalOpen(true)} className="p-1.5 bg-slate-100 rounded-lg hover:bg-slate-200 text-slate-600 transition dark:bg-slate-800 dark:hover:bg-slate-700" title="Cập nhật ODO">
                  <Gauge className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl border shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Battery className="w-5 h-5 text-green-500" /> Pin hiện tại
            </h2>
            {currentBattery && (
              <Link to={`/app/bookings/new?vehicleId=${vehicle.id}`} className="text-sm font-semibold text-blue-600 hover:underline">
                Đặt lịch đổi pin
              </Link>
            )}
          </div>

          {currentBattery ? (
            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl flex items-center justify-between mb-2 border border-slate-100 dark:border-slate-700">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Mã Pin</p>
                  <p className="font-mono font-bold text-lg">{extractBatteryCode(currentBattery.batteryCode)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500 mb-1">Sức khỏe dự đoán</p>
                  <p className="font-bold text-xl text-green-600 dark:text-green-400">{currentBattery.estimatedSoH?.toFixed(2)}%</p>
                </div>
              </div>

              {needsAttention && (
                <div className="p-3 bg-red-50 text-red-700 rounded-xl flex gap-3 text-sm border border-red-200">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <p><strong>Cảnh báo:</strong> Tình trạng pin đang {currentBattery?.healthClassification === 'UNSAFE' ? 'Không an toàn' : currentBattery?.healthClassification === 'REPLACEMENT_REQUIRED' ? 'Cần thay thế' : currentBattery?.healthClassification === 'LIMITED' ? 'Bị giới hạn' : currentBattery?.healthClassification === 'NEEDS_MAINTENANCE' ? 'Cần bảo trì' : currentBattery?.healthClassification}. Vui lòng đổi pin sớm nhất có thể.</p>
                </div>
              )}

              <div className="flex justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Loại Pin</span>
                <span className="font-medium">{currentBattery.batteryType || vehicle.batteryType}</span>
              </div>
              <div className="flex justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Trạng thái</span>
                <span className={`font-medium ${
                   (currentBattery.estimatedSoH && currentBattery.estimatedSoH < 70) || currentBattery.healthClassification === 'REPLACEMENT_REQUIRED' || currentBattery.healthClassification === 'UNSAFE' ? 'text-red-600' :
                   currentBattery.healthClassification === 'NEEDS_MAINTENANCE' || currentBattery.healthClassification === 'LIMITED' ? 'text-orange-500' :
                   'text-green-600'
                }`}>
                  {(currentBattery.estimatedSoH && currentBattery.estimatedSoH < 70) || currentBattery.healthClassification === 'REPLACEMENT_REQUIRED' || currentBattery.healthClassification === 'UNSAFE' ? 'Yêu cầu thay' :
                   currentBattery.healthClassification === 'NEEDS_MAINTENANCE' || currentBattery.healthClassification === 'LIMITED' ? 'Cần kiểm tra' :
                   'An toàn'}
                </span>
              </div>
              <div className="flex justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Trạng thái sửa chữa</span>
                <span className="font-medium">
                  {vehicle.status === 'IN_SWAP_PROCESS' ? 'Đang thay pin' : 
                   vehicle.status === 'IN_SERVICE' ? 'Đang kiểm tra' : 
                   'Không'}
                </span>
              </div>
              <div className="flex justify-between pt-1 border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Lần kiểm tra cuối</span>
                <span className="font-medium">{currentBattery.lastInspectionAt ? new Date(currentBattery.lastInspectionAt).toLocaleDateString() : 'Không có'}</span>
              </div>
            </div>
          ) : (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <Battery className="w-12 h-12 text-slate-300 mb-4" />
              <p className="text-lg font-semibold text-slate-600">Chưa có pin đang hoạt động</p>
              <p className="text-sm text-slate-400 mt-2">Hãy đặt lịch đổi pin để nhận pin mới.</p>
            </div>
          )}
        </div>
      </div>

      {isEditModalOpen && (
        <EditVehicleDialog 
          vehicle={vehicle} 
          onClose={() => setIsEditModalOpen(false)} 
          onSuccess={() => { setIsEditModalOpen(false); fetchVehicle(); }} 
        />
      )}
      {isMileageModalOpen && (
        <UpdateMileageDialog 
          vehicle={vehicle} 
          onClose={() => setIsMileageModalOpen(false)} 
          onSuccess={() => { setIsMileageModalOpen(false); fetchVehicle(); }} 
        />
      )}
      {isQrModalOpen && (
        <VehicleQrDialog 
          vehicleId={vehicle.id} 
          onClose={() => setIsQrModalOpen(false)} 
        />
      )}
    </div>
  );
};
