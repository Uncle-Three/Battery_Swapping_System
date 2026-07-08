import React, { useEffect, useState } from 'react';
import { reportService } from '../../../../services/reportService';
import { LoadingSpinner } from '../../../../components/feedback/LoadingSpinner';
import { Package, Battery, Hammer, Zap, ShieldAlert } from 'lucide-react';

export const Inventory: React.FC = () => {
  const [inventory, setInventory] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="flex flex-col gap-6 text-left max-w-4xl">
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
        <div className="bg-gradient-to-br from-green-600 to-green-700 text-white rounded-xl p-6 shadow-md flex justify-between items-center md:col-span-1">
          <div>
            <span className="text-xs text-green-100 font-semibold uppercase tracking-wider">Tổng số lượng pin</span>
            <h2 className="text-4xl font-black mt-1">{inventory?.totalBatteries}</h2>
            <p className="text-xs text-green-150 mt-2">Đã tối ưu hóa lưu lượng</p>
          </div>
          <div className="p-3 bg-white/10 rounded-lg">
            <Package className="h-8 w-8" />
          </div>
        </div>

        {/* Detailed inventory counts */}
        <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-xl p-6 shadow-sm md:col-span-2 flex flex-col gap-5">
          <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
            Phân bố chi tiết
          </h3>

          <div className="flex flex-col gap-4">
            {items.map((item) => {
              const percentage = (item.count / inventory?.totalBatteries) * 100;
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex flex-col gap-1">
                  <div className="flex justify-between items-center text-sm">
                    <span className="flex items-center gap-2 font-medium">
                      <Icon className="h-4 w-4 text-slate-500" />
                      <span>{item.label}</span>
                    </span>
                    <strong className="font-bold">{item.count} pin ({percentage.toFixed(1)}%)</strong>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                    <div className={`h-full ${item.color}`} style={{ width: `${percentage}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
