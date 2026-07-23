import { useState, useEffect, type FC } from 'react';
import { Badge } from '../../../../components/ui/Badge';
import { Search, History, ChevronLeft, ChevronRight } from 'lucide-react';
import { adminService } from '../../../../services/adminService';
import { statusLabel } from '../../../../utils/viLabels';

export const AuditLogs: FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  useEffect(() => {
    loadLogs();
  }, [page, searchTerm]); // Debouncing would be better here in real app, but this is fine for now

  const loadLogs = async () => {
    try {
      setLoading(true);
      const data = await adminService.getAuditLogs({ limit, offset: (page - 1) * limit, action: searchTerm || undefined });
      setLogs(data.items);
      setTotal(data.total);
    } catch (error) {
      console.error('Failed to load audit logs', error);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="flex flex-col gap-6 text-left max-w-6xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg">
            <History className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              Nhật ký hệ thống
            </h2>
            <p className="text-sm text-slate-550 dark:text-slate-400 mt-0.5">
              Theo dõi toàn bộ các tác vụ thay đổi dữ liệu của quản trị viên và hệ thống.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-850 rounded-2xl p-4 shadow-sm flex items-center">
        <div className="relative w-full sm:max-w-md">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            className="w-full pl-9 pr-4 py-2 border border-slate-250 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Tìm theo hành động..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1); // Reset page on search
            }}
          />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-850 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 border-b border-slate-205 dark:border-slate-850">
              <tr>
                <th className="px-6 py-3 font-semibold">Thời gian</th>
                <th className="px-6 py-3 font-semibold">Quản trị viên</th>
                <th className="px-6 py-3 font-semibold">Hành động</th>
                <th className="px-6 py-3 font-semibold">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="px-6 py-3 text-slate-500">
                    {new Date(log.time).toLocaleString('vi-VN')}
                  </td>
                  <td className="px-6 py-3">
                    <div className="font-medium text-slate-900 dark:text-slate-100">{log.adminName || 'Hệ thống'}</div>
                    <div className="text-xs text-slate-500">{log.adminEmail || '—'}</div>
                  </td>
                  <td className="px-6 py-3">
                    <Badge variant="info">{statusLabel(log.action)}</Badge>
                  </td>
                  <td className="px-6 py-3">
                    <div className="text-xs font-mono bg-slate-100 dark:bg-slate-950 p-2 rounded max-w-md overflow-hidden text-ellipsis">
                      {log.details}
                    </div>
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                    {loading ? 'Đang tải...' : 'Không tìm thấy nhật ký nào.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-205 dark:border-slate-850 px-6 py-3 bg-slate-50 dark:bg-slate-900">
            <span className="text-sm text-slate-500">
              Hiển thị {(page - 1) * limit + 1} - {Math.min(page * limit, total)} trong {total}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="p-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-50"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
                className="p-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-50"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogs;
