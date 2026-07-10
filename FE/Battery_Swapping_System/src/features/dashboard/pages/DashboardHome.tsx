import { type FC } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { Button } from '../../../components/ui/Button';
import { Link } from 'react-router-dom';
import { Zap } from 'lucide-react';

export const DashboardHome: FC = () => {
  const { user } = useAuth();

  return (
    <div className="flex flex-col gap-6 text-left max-w-4xl">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">
            Chào mừng quay lại, {user?.name || 'Vận hành viên'}!
          </h2>
          <p className="text-sm text-slate-550 dark:text-slate-400 mt-1">
            Hệ thống đang hoạt động ổn định. Chọn các mục quản lý ở thanh bên trái hoặc xem thống kê nhanh bên dưới.
          </p>
        </div>
        <div className="px-4 py-2 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 rounded-xl text-sm font-semibold flex items-center gap-1.5 self-start">
          <Zap className="h-4 w-4 fill-current animate-pulse" />
          <span>Vận hành: {user?.role}</span>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-lg text-slate-850 dark:text-slate-100 mb-2">Thao tác nghiệp vụ trạm</h3>
            <p className="text-sm text-slate-500 mb-4">
              Dành cho nhân viên trực trạm sạc: quét thẻ RFID, biển số khách hàng, xác thực tài khoản và bấm lệnh tháo lắp/nhả pin từ tủ.
            </p>
          </div>
          <Link to="/dashboard/staff/verify" className="self-start">
            <Button variant="primary">Đi đến xác thực</Button>
          </Link>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-lg text-slate-850 dark:text-slate-100 mb-2">Giám sát kỹ thuật</h3>
            <p className="text-sm text-slate-500 mb-4">
              Dành cho nhân viên kỹ thuật: chẩn đoán trạng thái BMS, nhiệt độ cell pin, ghi chép bảo trì, nâng cấp firmware và cập nhật SoH pin lỗi.
            </p>
          </div>
          <Link to="/dashboard/tech/inspect" className="self-start">
            <Button variant="secondary">Kiểm tra pin lỗi</Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
export default DashboardHome;
