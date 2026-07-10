import { useState, type FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table } from '../../../../components/ui/Table';
import { Badge } from '../../../../components/ui/Badge';
import { Button } from '../../../../components/ui/Button';
import { AlertTriangle, Wrench, Search, ShieldAlert } from 'lucide-react';

export const BatteryInspect: FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');

  // Mock abnormal batteries list
  const [faultyBatteries] = useState([
    { id: 'b-101', serialNumber: 'BT-SN-9912', soc: 40, soh: 55, temperature: 62, voltage: 38, status: 'FAULTY', severity: 'CRITICAL', errorLog: 'Quá nhiệt khi sạc (>60C)' },
    { id: 'b-102', serialNumber: 'BT-SN-8711', soc: 95, soh: 60, temperature: 38, voltage: 42, status: 'MAINTENANCE', severity: 'WARNING', errorLog: 'SoH suy giảm nghiêm trọng' },
    { id: 'b-103', serialNumber: 'BT-SN-3091', soc: 0, soh: 88, temperature: 25, voltage: 12, status: 'FAULTY', severity: 'CRITICAL', errorLog: 'Mất kết nối giao tiếp BMS' },
    { id: 'b-104', serialNumber: 'BT-SN-4412', soc: 78, soh: 94, temperature: 48, voltage: 47, status: 'MAINTENANCE', severity: 'LOW', errorLog: 'Cảnh báo chênh lệch điện áp' },
  ]);

  const handleFixRedirect = (battery: typeof faultyBatteries[0]) => {
    navigate('/dashboard/tech/maintenance', {
      state: {
        batteryId: battery.id,
        soh: battery.soh,
        soc: battery.soc,
        notes: `Xử lý lỗi hệ thống: ${battery.errorLog}. Đo đạc lại thông số vật lý.`,
      },
    });
  };

  const filteredBatteries = faultyBatteries.filter((b) => {
    const matchesSearch = b.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) || b.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeverity = severityFilter === 'ALL' || b.severity === severityFilter;
    return matchesSearch && matchesSeverity;
  });

  return (
    <div className="flex flex-col gap-6 text-left max-w-5xl">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-red-50 dark:bg-red-950/20 text-red-650 dark:text-red-400 rounded-lg">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            Danh sách Pin lỗi cần kiểm tra
          </h2>
          <p className="text-sm text-slate-550 dark:text-slate-400 mt-0.5">
            Cảnh báo từ hệ thống giám sát pin (BMS) về các bộ pin quá nhiệt, điện áp bất thường hoặc chai SoH.
          </p>
        </div>
      </div>

      {/* Filters toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:max-w-xs">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            className="w-full pl-9 pr-4 py-2 border border-slate-250 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Tìm theo Serial hoặc ID pin..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={() => setSeverityFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              severityFilter === 'ALL'
                ? 'border-green-600 bg-green-50 text-green-700 dark:border-green-500 dark:bg-green-950/20 dark:text-green-300'
                : 'border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900'
            }`}
          >
            Tất cả mức độ
          </button>
          <button
            onClick={() => setSeverityFilter('CRITICAL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              severityFilter === 'CRITICAL'
                ? 'border-red-600 bg-red-50 text-red-700 dark:border-red-500 dark:bg-red-950/20 dark:text-red-300'
                : 'border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900'
            }`}
          >
            Nghiêm trọng (Critical)
          </button>
          <button
            onClick={() => setSeverityFilter('WARNING')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              severityFilter === 'WARNING'
                ? 'border-yellow-600 bg-yellow-50 text-yellow-700 dark:border-yellow-500 dark:bg-yellow-950/20 dark:text-yellow-300'
                : 'border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900'
            }`}
          >
            Cảnh báo (Warning)
          </button>
        </div>
      </div>

      {filteredBatteries.length === 0 ? (
        <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 border-dashed rounded-xl p-12 text-center text-slate-500 flex flex-col items-center gap-3">
          <ShieldAlert className="h-10 w-10 text-slate-400" />
          <p className="text-sm">Không tìm thấy pin lỗi nào phù hợp với bộ lọc hiện tại.</p>
        </div>
      ) : (
        <Table headers={['ID Pin', 'Số Serial', 'SoH (%)', 'Nhiệt độ (C)', 'Điện áp (V)', 'Mô tả lỗi', 'Mức độ', 'Thao tác']}>
          {filteredBatteries.map((b) => (
            <tr key={b.id} className="hover:bg-slate-55 dark:hover:bg-slate-800/40 transition-colors">
              <td className="px-6 py-4 font-mono text-xs font-bold">{b.id}</td>
              <td className="px-6 py-4">{b.serialNumber}</td>
              <td className="px-6 py-4 font-semibold">{b.soh}%</td>
              <td className="px-6 py-4">
                <span className={b.temperature > 50 ? 'text-red-500 font-bold' : ''}>{b.temperature}°C</span>
              </td>
              <td className="px-6 py-4">{b.voltage}V</td>
              <td className="px-6 py-4">
                <span className="text-red-650 dark:text-red-400 font-semibold text-xs bg-red-50 dark:bg-red-950/20 px-2.5 py-1 rounded-md">
                  {b.errorLog}
                </span>
              </td>
              <td className="px-6 py-4">
                <Badge variant={b.severity === 'CRITICAL' ? 'error' : b.severity === 'WARNING' ? 'warning' : 'info'}>
                  {b.severity}
                </Badge>
              </td>
              <td className="px-6 py-4">
                <Button size="sm" variant="primary" className="flex items-center gap-1" onClick={() => handleFixRedirect(b)}>
                  <Wrench className="h-3.5 w-3.5" />
                  <span>Khắc phục</span>
                </Button>
              </td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
};
export default BatteryInspect;
