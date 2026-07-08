import React, { useState } from 'react';
import { Table } from '../../../../components/ui/Table';
import { Badge } from '../../../../components/ui/Badge';
import { Button } from '../../../../components/ui/Button';
import { Sliders, Plus, Edit2 } from 'lucide-react';

export const StationConfig: React.FC = () => {
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

  return (
    <div className="flex flex-col gap-6 text-left max-w-5xl">
      <div className="flex items-center justify-between">
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

      <Table headers={['ID Trạm', 'Tên trạm', 'Địa chỉ', 'Kinh/Vĩ độ', 'Trạng thái', 'Hành động']}>
        {stations.map((st) => (
          <tr key={st.id} className="hover:bg-slate-55 dark:hover:bg-slate-800/40 transition-colors">
            <td className="px-6 py-4 font-mono text-xs font-bold">{st.id}</td>
            <td className="px-6 py-4 font-semibold text-slate-850 dark:text-slate-100">{st.name}</td>
            <td className="px-6 py-4 text-xs text-slate-500">{st.address}</td>
            <td className="px-6 py-4 font-mono text-xs">
              {st.lat.toFixed(4)}, {st.lng.toFixed(4)}
            </td>
            <td className="px-6 py-4">
              <Badge variant={st.status === 'ACTIVE' ? 'success' : st.status === 'MAINTENANCE' ? 'warning' : 'error'}>
                {st.status}
              </Badge>
            </td>
            <td className="px-6 py-4 flex gap-2">
              <Button size="sm" variant="outline" onClick={() => toggleStationStatus(st.id)}>
                {st.status === 'ACTIVE' ? 'Bảo trì' : 'Kích hoạt'}
              </Button>
              <Button size="sm" variant="secondary" className="flex items-center gap-1">
                <Edit2 className="h-3 w-3" />
                <span>Sửa</span>
              </Button>
            </td>
          </tr>
        ))}
      </Table>
    </div>
  );
};
