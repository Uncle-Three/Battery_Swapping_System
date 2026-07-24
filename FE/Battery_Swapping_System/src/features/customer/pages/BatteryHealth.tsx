import { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { memberService, type VehicleView } from '../../../services/memberService';
import { LoadingSpinner } from '../../../components/feedback/LoadingSpinner';
import { getApiErrorMessage } from '../../../services/apiClient';
import { Button } from '../../../components/ui/Button';
import { Battery, Activity, Zap, Thermometer, RefreshCcw, Car, RefreshCw, CalendarPlus, ArrowLeft } from 'lucide-react';

const extractBatteryCode = (code: string | undefined | null) => {
  if (!code) return 'Chưa có Pin';
  if (code.includes('batteryCode=')) {
    const match = code.match(/batteryCode=([^&]*)/);
    if (match && match[1]) return match[1];
  }
  return code.split('/').pop() || code;
};

export const BatteryHealth = () => {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<VehicleView[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await memberService.dashboard(true);
      setVehicles(data.vehicles);
    } catch (err: any) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (loading && !vehicles) return <LoadingSpinner label="Đang tải dữ liệu BMS..." />;

  const selected = vehicles?.find((item) => item.id === params.get('vehicleId')) ?? vehicles?.[0];
  const battery = selected?.batteryAssignments?.[0]?.battery;

  const needsAttention = battery && (battery.safetyState === 'UNSAFE' || battery.soh < 70);

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white">Sức khỏe Pin</h1>
          <p className="text-sm text-slate-500 mt-1">
            Theo dõi tình trạng và hiệu suất pin xe của bạn theo thời gian thực
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)} 
            className="flex items-center gap-2 px-4 py-2 rounded-xl border hover:bg-slate-50 text-slate-600 dark:text-slate-300 dark:hover:bg-slate-800 transition font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            Quay lại xe
          </button>
          <button 
            onClick={fetchDashboardData} 
            className="p-2.5 rounded-xl border hover:bg-slate-50 text-slate-600 dark:text-slate-300 dark:hover:bg-slate-800 transition"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-2xl border border-red-200 font-medium">
          {error}
        </div>
      )}

      {vehicles && vehicles.length > 0 && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
            <Car className="w-4 h-4 text-blue-500" />
            Chọn phương tiện
          </label>
          <select
            className="w-full md:w-1/2 rounded-xl border-slate-200 bg-slate-50 dark:bg-slate-800 dark:border-slate-700 p-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 transition-shadow outline-none"
            value={selected?.id ?? ''}
            onChange={(e) => setParams({ vehicleId: e.target.value })}
          >
            {vehicles.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} ({item.plateNumber})
              </option>
            ))}
          </select>
        </div>
      )}

      {vehicles?.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center text-center bg-slate-50 dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-full shadow-sm mb-4">
            <Car className="w-10 h-10 text-slate-400" />
          </div>
          <h3 className="text-xl font-bold mb-2">Chưa có xe nào được đăng ký</h3>
          <p className="text-slate-500 max-w-md mb-6">
            Thêm xe điện của bạn để quản lý pin, xem tình trạng và đặt lịch đổi pin.
          </p>
          <Link to="/app/vehicles">
            <button className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition">
              Đến trang quản lý Xe
            </button>
          </Link>
        </div>
      ) : battery ? (
        <div className="space-y-6">
          <section className={`rounded-3xl border bg-white p-6 md:p-8 dark:bg-slate-900 transition-colors shadow-sm ${
            needsAttention ? 'border-l-4 border-red-500 dark:border-red-500' : 
            'border-l-4 border-green-500 dark:border-green-500'
          }`}>
            <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
              <Battery className="w-32 h-32" />
            </div>
            
            <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase">
                    Mã Pin
                  </span>
                  <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wider ${
                    needsAttention ? 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800' : 
                    'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800'
                  }`}>
                    {needsAttention ? 'Yêu cầu thay' : 'An toàn'}
                  </span>
                </div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight" title={battery.serialNumber}>
                  {extractBatteryCode(battery.serialNumber)}
                </h2>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 mt-4 md:mt-0">
                {selected?.status === 'ACTIVE' ? (
                  <Link to={`/app/bookings/new?vehicleId=${selected.id}`}>
                    <Button className="w-full sm:w-auto rounded-xl font-semibold shadow-sm hover:shadow-md transition-all bg-blue-600 hover:bg-blue-700 text-white">
                      <CalendarPlus className="w-4 h-4 mr-2" />
                      Đặt lịch thay pin
                    </Button>
                  </Link>
                ) : (
                  <Button disabled title="Xe đang tắt, hãy bật lại để đặt lịch" className="w-full sm:w-auto rounded-xl font-semibold">
                    <CalendarPlus className="w-4 h-4 mr-2" />
                    Xe đang tắt
                  </Button>
                )}
              </div>
            </div>

            <div className="relative z-10 mt-8 grid grid-cols-2 gap-4 md:grid-cols-5">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 transition-colors">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <Activity className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider" title="State of Health - Trạng thái sức khỏe pin">
                    {battery.healthLogs?.[0]?.dataSource === 'STAFF' || battery.healthLogs?.[0]?.dataSource === 'MANUAL' ? 'Sức khỏe thực tế' : 'Sức khỏe dự đoán'}
                  </p>
                </div>
                <p className={`text-2xl font-black ${
                  battery.soh < 70 ? 'text-red-600 dark:text-red-500' : 
                  battery.soh < 80 ? 'text-orange-600 dark:text-orange-500' :
                  'text-green-600 dark:text-green-500'
                }`}>
                  {battery.soh}%
                </p>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 transition-colors">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Battery className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider" title="State of Charge - Mức pin hiện tại">Mức Pin (SoC)</p>
                </div>
                <p className={`text-2xl font-black ${battery.soc <= 20 ? 'text-red-600 dark:text-red-500' : 'text-green-600 dark:text-green-500'}`}>
                  {battery.soc}%
                </p>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 transition-colors">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <RefreshCcw className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider" title="Tổng số chu kỳ sạc/xả hoàn chỉnh">Chu kỳ sạc</p>
                </div>
                <p className="text-2xl font-black text-slate-900 dark:text-white">{battery.cycleCount}</p>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 transition-colors">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                    <Thermometer className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                  </div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Nhiệt độ Pin</p>
                </div>
                <p className="text-2xl font-black text-slate-900 dark:text-white">{battery.temperature}°C</p>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 transition-colors">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                    <Zap className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Điện áp tổng</p>
                </div>
                <p className="text-2xl font-black text-slate-900 dark:text-white">{battery.voltage}V</p>
              </div>
            </div>
          </section>
        </div>
      ) : (
        <div className="py-20 flex flex-col items-center justify-center text-center bg-slate-50 dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-full shadow-sm mb-4">
            <Battery className="w-10 h-10 text-slate-400" />
          </div>
          <h3 className="text-xl font-bold mb-2">Chưa có pin</h3>
          <p className="text-slate-500 max-w-md">
            Phương tiện này hiện chưa có pin nào đang được sử dụng trong hệ thống.
          </p>
        </div>
      )}
    </div>
  );
};
