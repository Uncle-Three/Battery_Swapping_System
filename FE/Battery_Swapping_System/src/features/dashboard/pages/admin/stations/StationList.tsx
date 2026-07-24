import { useState, useEffect, type FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table } from '../../../../../components/ui/Table';
import { Badge } from '../../../../../components/ui/Badge';
import { Button } from '../../../../../components/ui/Button';
import { Modal } from '../../../../../components/ui/Modal';
import { Sliders, Plus, Search, MapPin, Map, Clock, Settings, ShieldCheck, FileEdit, Eye, Edit2, Wrench, RefreshCcw, Trash2 } from 'lucide-react';
import { adminService } from '../../../../../services/adminService';
import type { Station } from '../../../../../types';

export const StationList: FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [cityFilter, setCityFilter] = useState('ALL');
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    action: async () => {}
  });

  const confirmAction = (title: string, message: string, action: () => Promise<void>) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      action: async () => {
        await action();
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

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

  const handleMaintenance = (st: Station) => {
    confirmAction(
      'Xác nhận Bảo trì',
      `Bạn có chắc muốn chuyển trạm "${st.name}" sang trạng thái Bảo trì?`,
      async () => {
        try {
          const marker = `\n[OLD_STATUS:${st.status}]`;
          await adminService.updateStation(st.id, { 
            status: 'MAINTENANCE',
            description: (st.description || '') + marker
          } as any);
          loadStations();
        } catch (error: any) {
          console.error('Failed to set maintenance', error);
          alert(error?.response?.data?.message || 'Lỗi khi cập nhật trạng thái');
        }
      }
    );
  };

  const handleDelete = (st: Station) => {
    confirmAction(
      'Xác nhận Xóa (Ngừng hoạt động)',
      `Bạn có chắc muốn chuyển trạm "${st.name}" sang trạng thái Không hoạt động?`,
      async () => {
        try {
          const marker = `\n[OLD_STATUS:${st.status}]`;
          await adminService.updateStation(st.id, { 
            status: 'INACTIVE',
            description: (st.description || '') + marker
          } as any);
          loadStations();
        } catch (error: any) {
          console.error('Failed to delete station', error);
          alert(error?.response?.data?.message || 'Lỗi khi xóa trạm');
        }
      }
    );
  };

  const handleRestore = (st: Station) => {
    confirmAction(
      'Xác nhận Khôi phục',
      `Bạn có chắc muốn khôi phục trạm "${st.name}"?`,
      async () => {
        try {
          let oldStatus = 'ACTIVE';
          let newDesc = st.description || '';
          const match = newDesc.match(/\n\[OLD_STATUS:(.*?)\]$/);
          if (match) {
            oldStatus = match[1];
            newDesc = newDesc.replace(/\n\[OLD_STATUS:.*?\]$/, '');
          }

          await adminService.updateStation(st.id, { 
            status: oldStatus,
            description: newDesc
          } as any);
          loadStations();
        } catch (error: any) {
          console.error('Failed to restore station', error);
          alert(error?.response?.data?.message || 'Lỗi khi khôi phục trạm');
        }
      }
    );
  };

  const filteredStations = stations.filter((st) => {
    const matchName = st.name.toLowerCase().includes(searchTerm.toLowerCase()) || (st.code && st.code.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchStatus = statusFilter === 'ALL' || st.status === statusFilter;
    const matchCity = cityFilter === 'ALL' || (st.province && st.province.includes(cityFilter));
    return matchName && matchStatus && matchCity;
  });

  const totalStations = stations.length;
  const activeStations = stations.filter(s => s.status === 'ACTIVE').length;
  const draftStations = stations.filter(s => s.status === 'DRAFT').length;
  const maintenanceStations = stations.filter(s => s.status === 'MAINTENANCE').length;

  const uniqueProvinces = Array.from(new Set(stations.map(s => s.province).filter(Boolean)));

  return (
    <div className="flex flex-col gap-6 text-left max-w-[1440px] mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-500 rounded-xl">
            <Sliders className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
              Quản lý Trạm Đổi Pin
            </h1>
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
              Quản lý toàn bộ cơ sở hạ tầng trạm đổi pin.
            </p>
          </div>
        </div>
        <Button variant="primary" className="flex items-center gap-2" onClick={() => navigate('/admin/stations/new')}>
          <Plus className="h-5 w-5" />
          <span>Tạo Trạm Mới</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 mb-2">
            <Map className="h-5 w-5 text-blue-500" />
            <span className="font-semibold text-sm uppercase tracking-wide">Tổng số</span>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white">{totalStations}</div>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5 shadow-sm dark:border-emerald-900/30 dark:bg-emerald-950/20">
          <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-500 mb-2">
            <ShieldCheck className="h-5 w-5" />
            <span className="font-semibold text-sm uppercase tracking-wide">Hoạt động</span>
          </div>
          <div className="text-3xl font-extrabold text-emerald-700 dark:text-emerald-400">{activeStations}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-800/50">
          <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400 mb-2">
            <FileEdit className="h-5 w-5" />
            <span className="font-semibold text-sm uppercase tracking-wide">Bản nháp</span>
          </div>
          <div className="text-3xl font-extrabold text-slate-700 dark:text-slate-400">{draftStations}</div>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-5 shadow-sm dark:border-amber-900/30 dark:bg-amber-950/20">
          <div className="flex items-center gap-3 text-amber-600 dark:text-amber-500 mb-2">
            <Settings className="h-5 w-5" />
            <span className="font-semibold text-sm uppercase tracking-wide">Bảo trì</span>
          </div>
          <div className="text-3xl font-extrabold text-amber-700 dark:text-amber-400">{maintenanceStations}</div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:max-w-md">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="h-5 w-5" />
          </span>
          <input
            type="text"
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow"
            placeholder="Tìm kiếm theo mã hoặc tên..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
          <select 
            className="w-full sm:w-auto px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow"
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
          >
            <option value="ALL">Tất cả khu vực</option>
            {uniqueProvinces.map((p) => (
              <option key={p as string} value={p as string}>{p}</option>
            ))}
          </select>
          <select 
            className="w-full sm:w-auto px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang hoạt động</option>
            <option value="DRAFT">Bản nháp</option>
            <option value="MAINTENANCE">Bảo trì</option>
            <option value="INACTIVE">Ngưng hoạt động</option>
          </select>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        <Table headers={['Mã Trạm', 'Tên & Vị trí', 'Giờ hoạt động', 'Khoang thay', 'Trạng thái', 'Hành động']}>
          {loading && <tr><td colSpan={6} className="text-center py-10 text-slate-500 font-semibold">Đang tải danh sách...</td></tr>}
          {!loading && filteredStations.length === 0 && (
            <tr><td colSpan={6} className="text-center py-10 text-slate-500 font-semibold">Không tìm thấy trạm đổi pin nào.</td></tr>
          )}
          {!loading && filteredStations.map((st) => (
            <tr key={st.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer" onClick={() => navigate(`/admin/stations/${st.id}`)}>
              <td className="px-6 py-4 font-mono text-sm font-bold text-slate-900 dark:text-white uppercase">
                {st.code || 'N/A'}
              </td>
              <td className="px-6 py-4">
                <div className="flex flex-col">
                  <span className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    {st.name}
                  </span>
                  <span className="flex items-center gap-1 text-xs font-semibold text-slate-500 mt-1 line-clamp-1">
                    <MapPin className="h-3 w-3" /> {st.province ? `${st.province}` : st.address}
                  </span>
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                  <Clock className="h-4 w-4 text-slate-400" />
                  {st.openingTime && st.closingTime ? `${st.openingTime} - ${st.closingTime}` : 'Chưa thiết lập'}
                </div>
              </td>
              <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-300">
                {st.serviceBaysCount || 0}
              </td>
              <td className="px-6 py-4">
                <Badge variant={st.status === 'ACTIVE' ? 'success' : st.status === 'DRAFT' ? 'gray' : st.status === 'MAINTENANCE' ? 'warning' : 'error'}>
                  {st.status === 'ACTIVE' ? 'Hoạt động' : st.status === 'INACTIVE' ? 'Không hoạt động' : st.status === 'DRAFT' ? 'Nháp' : st.status === 'MAINTENANCE' ? 'Bảo trì' : st.status}
                </Badge>
              </td>
              <td className="px-6 py-4 flex justify-end gap-2">
                <Button size="sm" variant="outline" className="p-2" title="Xem" onClick={(e: any) => { e.stopPropagation(); navigate(`/admin/stations/${st.id}`); }}>
                  <Eye className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline" className="p-2" title="Sửa" onClick={(e: any) => { e.stopPropagation(); navigate(`/admin/stations/${st.id}/edit`); }}>
                  <Edit2 className="h-4 w-4" />
                </Button>
                {st.status === 'ACTIVE' && (
                  <Button size="sm" variant="outline" className="p-2" title="Bảo trì" onClick={(e: any) => { e.stopPropagation(); handleMaintenance(st); }}>
                    <Wrench className="h-4 w-4" />
                  </Button>
                )}
                {(st.status === 'INACTIVE' || st.status === 'MAINTENANCE') ? (
                  <Button size="sm" variant="outline" className="p-2" title="Khôi phục" onClick={(e: any) => { e.stopPropagation(); handleRestore(st); }}>
                    <RefreshCcw className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button size="sm" className="p-2 bg-rose-100 text-rose-600 hover:bg-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:hover:bg-rose-900/50" title="Xóa" onClick={(e: any) => { e.stopPropagation(); handleDelete(st); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </Table>
      </div>

      <Modal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        title={confirmModal.title}
        footer={
          <div className="flex gap-3 justify-end w-full">
            <Button variant="outline" onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}>
              Hủy
            </Button>
            <Button variant="primary" onClick={confirmModal.action}>
              Xác nhận
            </Button>
          </div>
        }
      >
        <p className="text-slate-600 dark:text-slate-300 font-semibold">{confirmModal.message}</p>
      </Modal>
    </div>
  );
};
