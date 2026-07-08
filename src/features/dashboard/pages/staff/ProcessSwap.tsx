import { useState, type FC } from 'react';
import { Button } from '../../../../components/ui/Button';
import { ArrowLeftRight, CheckCircle2, ChevronRight, Unlock } from 'lucide-react';

export const ProcessSwap: FC = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const handleStep1 = () => {
    setLoading(true);
    setTimeout(() => {
      setStep(2);
      setLoading(false);
    }, 1000);
  };

  const handleStep2 = () => {
    setLoading(true);
    setTimeout(() => {
      setStep(3);
      setLoading(false);
    }, 1200);
  };

  const handleReset = () => {
    setStep(1);
  };

  return (
    <div className="flex flex-col gap-6 text-left max-w-4xl">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
          Thao tác kỹ thuật Đổi Pin
        </h2>
        <p className="text-sm text-slate-550 dark:text-slate-400 mt-1">
          Quy trình hướng dẫn kỹ thuật viên / nhân viên trạm thực hiện tháo lắp và đồng bộ dữ liệu pin.
        </p>
      </div>

      {/* Progress timeline */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between max-w-lg mx-auto mb-8">
          <div className="flex flex-col items-center gap-1.5">
            <span className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm ${
              step >= 1 ? 'bg-green-600 text-white' : 'bg-slate-200 text-slate-500'
            }`}>1</span>
            <span className="text-xs font-semibold">Nhận pin cũ</span>
          </div>
          <ChevronRight className="h-5 w-5 text-slate-400" />
          <div className="flex flex-col items-center gap-1.5">
            <span className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm ${
              step >= 2 ? 'bg-green-600 text-white' : 'bg-slate-200 text-slate-500'
            }`}>2</span>
            <span className="text-xs font-semibold">Lắp pin mới</span>
          </div>
          <ChevronRight className="h-5 w-5 text-slate-400" />
          <div className="flex flex-col items-center gap-1.5">
            <span className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm ${
              step >= 3 ? 'bg-green-600 text-white' : 'bg-slate-200 text-slate-500'
            }`}>3</span>
            <span className="text-xs font-semibold">Hoàn tất</span>
          </div>
        </div>

        {/* Step Contents */}
        {step === 1 && (
          <div className="flex flex-col gap-4 max-w-md mx-auto text-center items-center py-4">
            <Unlock className="h-10 w-10 text-yellow-600 animate-pulse" />
            <h3 className="font-bold text-lg">Bước 1: Mở khóa slot nhận pin cũ</h3>
            <p className="text-sm text-slate-500">
              Nhấp nút dưới để kích hoạt lệnh mở cửa slot trống tại cabin sạc nhằm cắm pin hết điện của khách hàng.
            </p>
            <Button onClick={handleStep1} loading={loading} className="w-full mt-2">
              Kích hoạt mở slot trống
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-4 max-w-md mx-auto text-center items-center py-4">
            <ArrowLeftRight className="h-10 w-10 text-green-600" />
            <h3 className="font-bold text-lg">Bước 2: Cắm pin và nhả pin mới</h3>
            <p className="text-sm text-slate-500">
              Pin yếu của khách hàng đã cắm vào Slot 3 thành công. Hệ thống đang sẵn sàng mở khóa nhả Pin đầy tại Slot 1.
            </p>
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs w-full text-left flex flex-col gap-1">
              <div>- Slot nhận pin cũ: <strong className="font-semibold text-red-500">Slot 3</strong></div>
              <div>- Slot nhả pin mới: <strong className="font-semibold text-green-600">Slot 1 (100% SoC)</strong></div>
            </div>
            <Button onClick={handleStep2} loading={loading} className="w-full mt-2">
              Nhả pin đầy (Slot 1)
            </Button>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-4 max-w-md mx-auto text-center items-center py-4">
            <CheckCircle2 className="h-12 w-12 text-green-600" />
            <h3 className="font-bold text-lg">Giao dịch đổi pin hoàn tất!</h3>
            <p className="text-sm text-slate-500">
              Hệ thống đã cập nhật chỉ số pin cũ vào cơ sở dữ liệu và đồng bộ giao dịch ví thành công cho khách hàng.
            </p>
            <Button onClick={handleReset} variant="outline" className="w-full mt-2">
              Bắt đầu giao dịch mới
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
