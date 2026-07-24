import { useEffect, useState } from 'react';
import { reportService, type InventoryReport } from '../../../../services/reportService';
import { LoadingSpinner } from '../../../../components/feedback/LoadingSpinner';
import { Table } from '../../../../components/ui/Table';
import { statusLabel } from '../../../../utils/viLabels';

export const Inventory = () => {
  const [data, setData] = useState<InventoryReport | null>(null); const [search, setSearch] = useState(''); const [error, setError] = useState('');
  useEffect(() => { reportService.getInventory().then(setData).catch((cause) => setError(cause instanceof Error ? cause.message : 'Không thể tải kho pin')); }, []);
  if (!data && !error) return <LoadingSpinner size="lg" label="Đang tải kho pin..." />;
  const batteries = data?.batteries.filter((item) => item.serialNumber.toLowerCase().includes(search.toLowerCase())) ?? [];
  return <div className="max-w-6xl space-y-6 text-left"><div><h2 className="text-2xl font-bold">Kho pin theo trạm</h2><p className="text-sm text-slate-500">Trạng thái an toàn và vận hành được đọc trực tiếp từ database.</p></div>{error && <p className="bg-red-50 p-3 text-red-700">{error}</p>}
    {data && <><div className="grid gap-3 sm:grid-cols-4"><div className="rounded-xl bg-green-600 p-5 text-white"><p>Tổng pin</p><p className="text-3xl font-bold">{data.totalBatteries}</p></div>{Object.entries(data.bySafetyState).map(([state, count]) => <div key={state} className="rounded-xl border bg-white p-5 dark:bg-slate-900"><p>{statusLabel(state)}</p><p className="text-2xl font-bold">{count}</p></div>)}</div><input className="w-full rounded-lg border p-3" placeholder="Tìm theo mã pin..." value={search} onChange={(e) => setSearch(e.target.value)} /><Table headers={['Mã pin', 'Loại', 'Trạm', 'Mức pin', 'Sức khỏe pin', 'Nhiệt độ', 'An toàn', 'Vận hành']}>{batteries.map((battery) => <tr key={battery.id}><td className="px-6 py-3 font-mono">{battery.serialNumber}</td><td className="px-6 py-3">{battery.batteryType?.code ?? '-'}</td><td className="px-6 py-3">{battery.station?.name ?? 'Đang trên xe'}</td><td className="px-6 py-3">{battery.soc}%</td><td className="px-6 py-3">{battery.soh}%</td><td className="px-6 py-3">{battery.temperature}°C</td><td className="px-6 py-3">{statusLabel(battery.safetyState)}</td><td className="px-6 py-3">{statusLabel(battery.operationalStatus)}</td></tr>)}</Table></>}
  </div>;
};
export default Inventory;
