import { useState, type FC } from 'react';
import { Table } from '../../../../components/ui/Table';
import { Badge } from '../../../../components/ui/Badge';
import { Button } from '../../../../components/ui/Button';
import { Sliders, Plus, Edit2, Search } from 'lucide-react';

export const StationConfig: FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [stations, setStations] = useState([
    { id: 'st-1', name: 'Trạm Sạc GreenCharge Quận 1', address: '120 Lê Lai, Quận 1', lat: 10.7719, lng: 106.6917, status: 'ACTIVE' },
    { id: 'st-2', name: 'Trạm Sạc GreenCharge Quận 7', address: '56 Nguyễn Thị Thập, Quận 7', lat: 10.7412, lng: 106.7013, status: 'ACTIVE' },
    { id: 'st-3', name: 'Trạm Sạc GreenCharge Bình Thạnh', address: '18 Điện Biên Phủ, Bình Thạnh', lat: 10.8012, lng: 106.7118, status: 'MAINTENANCE' },
  ]);

  const toggleStationStatus = (id: string) => {
    setStations(stations.map((st) => {
      if (st.id === id) {
        return {
          ...st,
          status: st.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
        };
      }
      return st;
    }));
  };

  const filteredStations = stations.filter((st) =>
    st.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    st.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6 text-left max-w-5xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-500 rounded-lg">
            <Sliders className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              Cấu hình Trạm sạc hệ thống
            </h2>
            <p className="text-sm text-slate-550 dark:text-slate-400 mt-0.5">
              Đăng ký trạm sạc mới, hiệu chỉnh tọa độ địa lý (GPS) và quản lý trạng thái đóng/mở trạm.
            </p>
          </div>
        </div>
        <Button variant="primary" className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          <span>Thêm trạm sạc</span>
        </Button>
      </div>

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
        {filteredStations.map((st) => (
          <tr key={st.id} className="hover:bg-slate-55 dark:hover:bg-slate-800/40 transition-colors">
            <td className="px-6 py-4 font-mono text-xs font-bold">{st.id}</td>
            <td className="px-6 py-4 font-semibold text-slate-855 dark:text-slate-100">{st.name}</td>
            <td className="px-6 py-4 text-xs text-slate-500">{st.address}</td>
            <td className="px-6 py-4 font-mono text-xs">
              {st.lat.toFixed(4)}, {st.lng.toFixed(4)}
            </td>
            <td className="px-6 py-4">
              <Badge variant={st.status === 'ACTIVE' ? 'success' : st.status === 'MAINTENANCE' ? 'warning' : 'error'}>
                {st.status}
              </Badge>
            </td>
            <td className="px-6 py-4">
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => toggleStationStatus(st.id)}>
                  {st.status === 'ACTIVE' ? 'Bảo trì' : 'Kích hoạt'}
                </Button>
                <Button size="sm" variant="secondary" className="flex items-center gap-1">
                  <Edit2 className="h-3 w-3" />
                  <span>Sửa</span>
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
