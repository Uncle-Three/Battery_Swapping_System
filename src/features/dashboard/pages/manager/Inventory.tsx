import { useEffect, useState, type FC } from 'react';
import { reportService } from '../../../../services/reportService';
import { LoadingSpinner } from '../../../../components/feedback/LoadingSpinner';
import { Table } from '../../../../components/ui/Table';
import { Badge } from '../../../../components/ui/Badge';
import { Package, Battery, Hammer, Zap, ShieldAlert, Search } from 'lucide-react';

export const Inventory: FC = () => {
  const [inventory, setInventory] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Detailed batteries database mock
  const [batteries] = useState([
    { id: 'b-101', serialNumber: 'BT-SN-9912', soc: 98, soh: 95, temp: 35, voltage: 48, status: 'READY', type: 'LFP 72V' },
    { id: 'b-102', serialNumber: 'BT-SN-8711', soc: 45, soh: 60, temp: 58, voltage: 42, status: 'MAINTENANCE', type: 'LFP 72V' },
    { id: 'b-103', serialNumber: 'BT-SN-3091', soc: 12, soh: 88, temp: 62, voltage: 38, status: 'FAULTY', type: 'Lithium 72V' },
    { id: 'b-104', serialNumber: 'BT-SN-4412', soc: 82, soh: 94, temp: 33, voltage: 48, status: 'READY', type: 'Lithium 72V' },
    { id: 'b-105', serialNumber: 'BT-SN-1122', soc: 100, soh: 98, temp: 31, voltage: 48, status: 'READY', type: 'LFP 72V' },
  ]);

  useEffect(() => {
    reportService.getInventory()
      .then((data) => {
        setInventory(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching inventory:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <LoadingSpinner size="lg" label="Đang tải dữ liệu tồn kho..." />;
  }

  const items = [
    { label: 'Sẵn sàng (Ready)', count: inventory?.readyBatteries, color: 'bg-green-500', icon: Zap },
    { label: 'Đang sạc (Charging)', count: inventory?.chargingBatteries, color: 'bg-yellow-500', icon: Battery },
    { label: 'Đang bảo trì (Maintenance)', count: inventory?.maintenanceBatteries, color: 'bg-orange-500', icon: Hammer },
    { label: 'Hỏng hóc (Faulty)', count: inventory?.faultyBatteries, color: 'bg-red-500', icon: ShieldAlert },
  ];

  const filteredBatteries = batteries.filter(b => 
    b.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) || 
    b.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6 text-left max-w-5xl">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
          Quản lý Kho Pin Vận hành
        </h2>
        <p className="text-sm text-slate-550 dark:text-slate-400 mt-1">
          Theo dõi tổng số lượng phân bổ pin và hiện trạng sử dụng trong toàn bộ hệ thống trạm.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Sum card */}
        <div className="bg-gradient-to-br from-green-600 to-green-700 text-white rounded-xl p-6 shadow-md flex flex-col justify-between md:col-span-1 h-fit">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs text-green-100 font-semibold uppercase tracking-wider">Tổng số lượng pin</span>
              <h2 className="text-4xl font-black mt-1">{inventory?.totalBatteries}</h2>
            </div>
            <div className="p-3 bg-white/10 rounded-lg">
              <Package className="h-6 w-6" />
            </div>
          </div>
          <p className="text-xs text-green-150 mt-4 font-semibold">Đồng bộ hoàn tất từ trạm</p>
        </div>

        {/* Detailed inventory counts */}
        <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-xl p-6 shadow-sm md:col-span-2 flex flex-col gap-5">
          <h3 className="font-bold text-sm text-slate-700 dark:text-slate-350 uppercase tracking-wider border-b border-slate-100 dark:border-slate-850 pb-2">
            Phân bố chi tiết trạng thái
          </h3>

          <div className="flex flex-col gap-4">
            {items.map((item) => {
              const percentage = (item.count / inventory?.totalBatteries) * 100;
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex flex-col gap-1">
                  <div className="flex justify-between items-center text-sm">
                    <span className="flex items-center gap-2 font-semibold text-slate-655 dark:text-slate-350">
                      <Icon className="h-4 w-4 text-slate-400" />
                      <span>{item.label}</span>
                    </span>
                    <strong className="font-bold">{item.count} pin ({percentage.toFixed(1)}%)</strong>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div className={`h-full ${item.color}`} style={{ width: `${percentage}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Batteries list tables */}
      <div className="flex flex-col gap-4 mt-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h3 className="font-bold text-base text-slate-900 dark:text-white">
            Danh sách thiết bị pin trong kho
          </h3>

          <div className="relative w-full sm:max-w-xs">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              className="w-full pl-9 pr-4 py-2 border border-slate-250 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Tìm ID, Serial hoặc Status..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <Table headers={['Mã Pin', 'Số Serial', 'Dòng pin', 'Dung lượng (SoC)', 'Sức khỏe (SoH)', 'Nhiệt độ', 'Trạng thái']}>
          {filteredBatteries.map((b) => (
            <tr key={b.id} className="hover:bg-slate-55 dark:hover:bg-slate-800/40 transition-colors">
              <td className="px-6 py-4 font-mono text-xs font-bold">{b.id}</td>
              <td className="px-6 py-4">{b.serialNumber}</td>
              <td className="px-6 py-4 text-xs font-semibold text-slate-500">{b.type}</td>
              <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-100">{b.soc}%</td>
              <td className="px-6 py-4 font-semibold">{b.soh}%</td>
              <td className="px-6 py-4 text-xs font-semibold">{b.temp}°C</td>
              <td className="px-6 py-4">
                <Badge variant={b.status === 'READY' ? 'success' : b.status === 'MAINTENANCE' ? 'warning' : 'error'}>
                  {b.status}
                </Badge>
              </td>
            </tr>
          ))}
        </Table>
      </div>
    </div>
  );
};
export default Inventory;
