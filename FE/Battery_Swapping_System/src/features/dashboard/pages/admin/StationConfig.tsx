import { useState, useEffect, type FC } from 'react';
import { Table } from '../../../../components/ui/Table';
import { Badge } from '../../../../components/ui/Badge';
import { Button } from '../../../../components/ui/Button';
import { Sliders, Plus, Search } from 'lucide-react';
import { adminService } from '../../../../services/adminService';
import type { Station } from '../../../../types';
import { statusLabel } from '../../../../utils/viLabels';

export const StationConfig: FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStations();
  }, []);

  const loadStations = async () => {
    try {
      setLoading(true);
      const data = await adminService.getStations();
      setStations(data);
    } catch (error) {
      console.error('Failed to load stations', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleStationStatus = async (id: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      await adminService.updateStation(id, { status: newStatus });
      loadStations();
    } catch (error) {
      console.error('Failed to update station status', error);
    }
  };

  const filteredStations = stations.filter((st) =>
    st.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    st.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newStation, setNewStation] = useState({ name: '', address: '', latitude: '', longitude: '' });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await adminService.createStation({
        code: `ST-MOCK-${Math.floor(Math.random() * 1000)}`,
        name: newStation.name,
        address: newStation.address,
        latitude: newStation.latitude,
        longitude: newStation.longitude,
        status: 'ACTIVE',
      } as any);
      setShowCreateModal(false);
      setNewStation({ name: '', address: '', latitude: '', longitude: '' });
      await loadStations();
    } catch (error) {
      console.error('Failed to create station', error);
      alert('Lỗi tạo trạm đổi pin');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 text-left max-w-5xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-500 rounded-lg">
            <Sliders className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              Cấu hình Trạm đổi pin hệ thống
            </h2>
            <p className="text-sm text-slate-550 dark:text-slate-400 mt-0.5">
              Đăng ký trạm đổi pin mới, hiệu chỉnh tọa độ địa lý (GPS) và quản lý trạng thái đóng/mở trạm.
            </p>
          </div>
        </div>
        <Button variant="primary" className="flex items-center gap-2" onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4" />
          <span>Thêm trạm đổi pin</span>
        </Button>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md shadow-xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold mb-4">Thêm trạm đổi pin mới</h3>
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label htmlFor="station-name" className="text-sm font-semibold">Tên trạm</label>
                <input id="station-name" type="text" required className="border rounded-lg p-2" value={newStation.name} onChange={e => setNewStation({...newStation, name: e.target.value})} />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="station-address" className="text-sm font-semibold">Địa chỉ</label>
                <input id="station-address" type="text" required className="border rounded-lg p-2" value={newStation.address} onChange={e => setNewStation({...newStation, address: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label htmlFor="station-latitude" className="text-sm font-semibold">Vĩ độ (Lat)</label>
                  <input id="station-latitude" type="number" step="any" required className="border rounded-lg p-2" value={newStation.latitude} onChange={e => setNewStation({...newStation, latitude: e.target.value})} />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="station-longitude" className="text-sm font-semibold">Kinh độ (Lng)</label>
                  <input id="station-longitude" type="number" step="any" required className="border rounded-lg p-2" value={newStation.longitude} onChange={e => setNewStation({...newStation, longitude: e.target.value})} />
                </div>
              </div>
              <div className="flex gap-3 justify-end mt-4">
                <Button variant="secondary" onClick={() => setShowCreateModal(false)} type="button">Hủy</Button>
                <Button variant="primary" type="submit" loading={loading}>Tạo mới</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toolbar filter */}
      <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-850 rounded-2xl p-4 shadow-sm flex items-center">
        <div className="relative w-full sm:max-w-xs">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            className="w-full pl-9 pr-4 py-2 border border-slate-250 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Tìm tên hoặc địa chỉ trạm..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Table headers={['ID Trạm', 'Tên trạm', 'Địa chỉ', 'Kinh/Vĩ độ', 'Trạng thái', 'Hành động']}>
        {loading && <tr><td colSpan={6} className="text-center py-4 text-slate-500">Đang tải...</td></tr>}
        {!loading && filteredStations.map((st) => (
          <tr key={st.id} className="hover:bg-slate-55 dark:hover:bg-slate-800/40 transition-colors">
            <td className="px-6 py-4 font-mono text-xs font-bold">{st.id}</td>
            <td className="px-6 py-4 font-semibold text-slate-855 dark:text-slate-100">{st.name}</td>
            <td className="px-6 py-4 text-xs text-slate-500">{st.address}</td>
            <td className="px-6 py-4 font-mono text-xs">
              {st.latitude.toFixed(4)}, {st.longitude.toFixed(4)}
            </td>
            <td className="px-6 py-4">
              <Badge variant={st.status === 'ACTIVE' ? 'success' : st.status === 'MAINTENANCE' ? 'warning' : 'error'}>
                {statusLabel(st.status)}
              </Badge>
            </td>
            <td className="px-6 py-4">
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => toggleStationStatus(st.id, st.status)}>
                  {st.status === 'ACTIVE' ? 'Bảo trì' : 'Kích hoạt'}
                </Button>
              </div>
            </td>
          </tr>
        ))}
      </Table>
    </div>
  );
};
export default StationConfig;
