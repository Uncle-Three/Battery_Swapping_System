import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { memberService, type VehicleView } from '../../../services/memberService';
import { LoadingSpinner } from '../../../components/feedback/LoadingSpinner';
import { getApiErrorMessage } from '../../../services/apiClient';

const extractBatteryCode = (code: string | undefined | null) => {
  if (!code) return 'Chưa có Pin';
  if (code.includes('batteryCode=')) {
    const match = code.match(/batteryCode=([^&]*)/);
    if (match && match[1]) return match[1];
  }
  return code.split('/').pop() || code;
};

export const BatteryHealthHistory = () => {
  const [params] = useSearchParams(); 
  const [vehicle, setVehicle] = useState<VehicleView | null>(null); 
  const [error, setError] = useState(''); 
  const id = params.get('vehicleId') ?? '';

  useEffect(() => { 
    if (id) {
      memberService.vehicle(id).then(setVehicle).catch((cause) => setError(getApiErrorMessage(cause))); 
    } else {
      setError('Thiếu mã xe.'); 
    }
  }, [id]);

  if (!vehicle && !error) return <LoadingSpinner label="Đang tải lịch sử đo..." />;
  if (error) return <p role="alert" className="bg-red-50 p-4 text-red-700 rounded-xl">{error}</p>;

  const battery = vehicle!.batteryAssignments[0]?.battery; 
  const logs = battery?.healthLogs ?? [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white">Lịch sử sức khỏe pin</h1>
          <p className="text-sm text-slate-500 mt-1">{vehicle!.name} · {extractBatteryCode(battery?.serialNumber)}</p>
        </div>
        <Link to={`/app/battery-health/current?vehicleId=${id}`}>
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold transition-all shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800">
            <ArrowLeft className="w-4 h-4" />
            Quay lại Sức khỏe Pin
          </button>
        </Link>
      </div>
      
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
            <tr>
              {['Thời gian', 'Sức khỏe (SoH)', 'Mức Pin (SoC)', 'Chu kỳ', 'Nhiệt độ', 'Điện áp', 'Trạng thái'].map((item) => (
                <th key={item} className="p-4 font-semibold text-slate-600 dark:text-slate-300">{item}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                <td className="p-4 text-slate-700 dark:text-slate-300">
                  {new Date(log.recordedAt).toLocaleString('vi-VN')}
                </td>
                <td className={`p-4 font-bold ${
                  log.soh < 70 ? 'text-red-600 dark:text-red-500' : 
                  log.soh < 80 ? 'text-orange-600 dark:text-orange-500' :
                  'text-green-600 dark:text-green-500'
                }`}>
                  <div className="flex flex-col">
                    <span>{log.soh}%</span>
                    <span className="text-[10px] font-normal text-slate-500 uppercase mt-0.5">{log.dataSource === 'STAFF' || log.dataSource === 'MANUAL' ? 'Thực tế' : 'Dự đoán'}</span>
                  </div>
                </td>
                <td className={`p-4 font-bold ${log.soc <= 20 ? 'text-red-600 dark:text-red-500' : 'text-green-600 dark:text-green-500'}`}>
                  {log.soc}%
                </td>
                <td className="p-4 text-slate-700 dark:text-slate-300">{log.cycleCount}</td>
                <td className="p-4 text-slate-700 dark:text-slate-300">{log.temperature}°C</td>
                <td className="p-4 text-slate-700 dark:text-slate-300">{log.voltage}V</td>
                <td className="p-4">
                  <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wider ${
                    log.soh < 70 || log.safetyState === 'UNSAFE' ? 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800' : 
                    'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800'
                  }`}>
                    {log.soh < 70 || log.safetyState === 'UNSAFE' ? 'Yêu cầu thay' : 'An toàn'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {logs.length === 0 && (
          <div className="p-8 text-center text-slate-500">
            Chưa có lịch sử đo.
          </div>
        )}
      </div>
    </div>
  );
};
