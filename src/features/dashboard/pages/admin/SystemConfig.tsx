import React, { useState } from 'react';
import { Input } from '../../../../components/ui/Input';
import { Button } from '../../../../components/ui/Button';
import { Table } from '../../../../components/ui/Table';
import { Settings, ShieldAlert } from 'lucide-react';

export const SystemConfig: React.FC = () => {
  const [swapPrice, setSwapPrice] = useState('45000');
  const [bookingLimit, setBookingLimit] = useState('30');
  const [saved, setSaved] = useState(false);

  // Mock system audit logs
  const [auditLogs] = useState([
    { id: 'log-1', adminName: 'Đỗ Minh Phú', action: 'Thay đổi đơn giá đổi pin', details: '40,000 -> 45,000 VND', time: '2026-07-08 14:22' },
    { id: 'log-2', adminName: 'Đỗ Minh Phú', action: 'Bảo trì trạm sạc Quận Bình Thạnh', details: 'Status: ACTIVE -> MAINTENANCE', time: '2026-07-08 10:15' },
    { id: 'log-3', adminName: 'Lê Thị Thu', action: 'Nâng quyền hạn tài khoản', details: 'User ID u-3: MEMBER -> STAFF', time: '2026-07-07 16:45' },
  ]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex flex-col gap-6 text-left max-w-5xl">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-500 rounded-lg">
          <Settings className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            Tham số & Nhật ký Hệ thống
          </h2>
          <p className="text-sm text-slate-550 dark:text-slate-400 mt-0.5">
            Cấu hình các chỉ số nghiệp vụ chung và theo dõi lịch sử thao tác quản trị viên (Audit Log).
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* System Settings Form */}
        <form onSubmit={handleSave} className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-xl p-5 shadow-sm flex flex-col gap-4 h-fit md:col-span-1">
          <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Cấu hình tham số
          </h3>
          <Input
            label="Đơn giá đổi pin tiêu chuẩn (VND)"
            type="number"
            value={swapPrice}
            onChange={(e) => setSwapPrice(e.target.value)}
            required
          />
          <Input
            label="Thời gian giữ slot tối đa mặc định (Phút)"
            type="number"
            value={bookingLimit}
            onChange={(e) => setBookingLimit(e.target.value)}
            required
          />
          {saved && (
            <span className="text-xs text-green-600 font-semibold">
              Đã lưu tham số hệ thống thành công!
            </span>
          )}
          <Button type="submit" className="w-full mt-2">
            Lưu thay đổi
          </Button>
        </form>

        {/* Audit Logs Table */}
        <div className="md:col-span-2 flex flex-col gap-4">
          <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldAlert className="h-5 w-5 text-slate-400" />
            <span>Audit Logs - Lịch sử quản trị</span>
          </h3>

          <Table headers={['Admin', 'Hành động', 'Nội dung chi tiết', 'Thời gian']}>
            {auditLogs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-55 dark:hover:bg-slate-800/40 transition-colors">
                <td className="px-6 py-4 font-bold text-slate-850 dark:text-slate-100">{log.adminName}</td>
                <td className="px-6 py-4 font-semibold text-xs text-slate-700 dark:text-slate-350">{log.action}</td>
                <td className="px-6 py-4 font-mono text-xs text-slate-500">{log.details}</td>
                <td className="px-6 py-4 text-xs text-slate-405">{log.time}</td>
              </tr>
            ))}
          </Table>
        </div>
      </div>
    </div>
  );
};
