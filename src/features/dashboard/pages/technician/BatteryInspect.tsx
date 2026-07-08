import { useState, type FC } from 'react';
import { Table } from '../../../../components/ui/Table';
import { Badge } from '../../../../components/ui/Badge';
import { AlertTriangle } from 'lucide-react';

export const BatteryInspect: FC = () => {
  // Mock abnormal batteries list
  const [faultyBatteries] = useState([
    { id: 'b-101', serialNumber: 'BT-SN-9912', soc: 40, soh: 55, temperature: 62, voltage: 38, status: 'FAULTY', errorLog: 'Quá nhiệt khi sạc (>60C)' },
    { id: 'b-102', serialNumber: 'BT-SN-8711', soc: 95, soh: 60, temperature: 38, voltage: 42, status: 'MAINTENANCE', errorLog: 'SoH suy giảm nghiêm trọng' },
    { id: 'b-103', serialNumber: 'BT-SN-3091', soc: 0, soh: 88, temperature: 25, voltage: 12, status: 'FAULTY', errorLog: 'Mất kết nối giao tiếp BMS' },
  ]);

  return (
    <div className="flex flex-col gap-6 text-left max-w-5xl">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-450 rounded-lg">
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

      <Table headers={['ID Pin', 'Số Serial', 'SoH (%)', 'Nhiệt độ (C)', 'Điện áp (V)', 'Mô tả lỗi', 'Hành động']}>
        {faultyBatteries.map((b) => (
          <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
            <td className="px-6 py-4 font-mono text-xs font-bold">{b.id}</td>
            <td className="px-6 py-4">{b.serialNumber}</td>
            <td className="px-6 py-4 font-semibold">{b.soh}%</td>
            <td className="px-6 py-4">
              <span className={b.temperature > 50 ? 'text-red-500 font-bold' : ''}>{b.temperature}°C</span>
            </td>
            <td className="px-6 py-4">{b.voltage}V</td>
            <td className="px-6 py-4">
              <span className="text-red-650 dark:text-red-400 font-medium text-xs bg-red-50 dark:bg-red-950/20 px-2.5 py-1 rounded-md">
                {b.errorLog}
              </span>
            </td>
            <td className="px-6 py-4">
              <Badge variant={b.status === 'FAULTY' ? 'error' : 'warning'}>
                {b.status}
              </Badge>
            </td>
          </tr>
        ))}
      </Table>
    </div>
  );
};
