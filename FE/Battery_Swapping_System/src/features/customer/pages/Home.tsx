import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { BatteryCharging, MapPin, Zap, Shield, ArrowRight } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';

export const Home: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="flex flex-col gap-16 py-8">
      {/* Hero Section */}
      <section className="text-center max-w-3xl mx-auto flex flex-col items-center gap-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green rounded-full text-sm font-semibold mb-2">
          <Zap className="h-4 w-4 fill-current" />
          <span>Giải pháp đổi pin hàng đầu</span>
        </div>
        <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight text-slate-900 dark:text-black">
          Đổi Pin Nhanh Chóng <br />
          <span className="text-green-600 dark:text-green-450">Chỉ Trong 30 Giây</span>
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl">
          Quên đi nỗi lo sạc pin hàng giờ. Tìm trạm gần nhất, đặt giữ slot pin và thực hiện đổi pin tại chỗ ngay lập tức để tiếp tục hành trình của bạn.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 mt-4">
          <Link to="/stations">
            <Button size="lg" className="flex items-center gap-2">
              <span>Tìm trạm sạc ngay</span>
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
          {!isAuthenticated && (
            <Link to="/login">
              <Button
                size="lg"
                variant="outline"
                className="text-green-600 dark:text-green-500 border-green-600 dark:border-green-500 hover:bg-green-50 dark:hover:bg-green-950/20"
              >
                Đăng nhập tài khoản
              </Button>
            </Link>
          )}
        </div>
      </section>

      {/* Features Grid */}
      <section className="grid md:grid-cols-3 gap-8">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col items-start gap-4">
          <div className="p-3 bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400 rounded-xl">
            <MapPin className="h-6 w-6" />
          </div>
          <h3 className="font-bold text-lg text-slate-900 dark:text-white">Bản Đồ Trực Quan</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Xem vị trí các trạm sạc gần bạn thời gian thực, cập nhật chính xác số lượng pin sẵn sàng đổi.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col items-start gap-4">
          <div className="p-3 bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400 rounded-xl">
            <BatteryCharging className="h-6 w-6" />
          </div>
          <h3 className="font-bold text-lg text-slate-900 dark:text-white">Giữ Pin Trước</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Đặt giữ slot pin online trước khi đến trạm trong vòng 15-30 phút, đảm bảo luôn có pin khi tới nơi.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col items-start gap-4">
          <div className="p-3 bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400 rounded-xl">
            <Shield className="h-6 w-6" />
          </div>
          <h3 className="font-bold text-lg text-slate-900 dark:text-white">An Toàn & Bền Bỉ</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Hệ thống quản lý pin thông minh (BMS) tự động kiểm tra sức khỏe pin (SoH), đảm bảo an toàn tuyệt đối.
          </p>
        </div>
      </section>
    </div>
  );
};
