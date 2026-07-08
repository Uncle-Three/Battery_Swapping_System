import { useState, type FC } from 'react';
import { Button } from '../../../../components/ui/Button';
import { Badge } from '../../../../components/ui/Badge';
import { ArrowLeftRight, CheckCircle2, ChevronRight, Unlock, Cpu, Sparkles, Receipt } from 'lucide-react';

export const ProcessSwap: FC = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Cabinet Slots states
  const [slots, setSlots] = useState([
    { number: 1, status: 'READY', soc: 100, doorLocked: true, description: 'Pin đầy sẵn sàng' },
    { number: 2, status: 'CHARGING', soc: 68, doorLocked: true, description: 'Đang sạc nhanh' },
    { number: 3, status: 'EMPTY', soc: 0, doorLocked: true, description: 'Slot trống chờ pin' },
  ]);

  const handleOpenEmptySlot = () => {
    setLoading(true);
    setTimeout(() => {
      // Unlock Slot 3
      setSlots(slots.map(s => s.number === 3 ? { ...s, doorLocked: false } : s));
      setStep(2);
      setLoading(false);
    }, 1000);
  };

  const handleInsertOldBattery = () => {
    setLoading(true);
    setTimeout(() => {
      // Slot 3 gets old battery (12% SoC) and doors lock
      setSlots(slots.map(s => {
        if (s.number === 3) {
          return { ...s, status: 'CHARGING', soc: 12, doorLocked: true, description: 'Pin yếu đang sạc' };
        }
        return s;
      }));
      setStep(3);
      setLoading(false);
    }, 1200);
  };

  const handleDispenseNewBattery = () => {
    setLoading(true);
    setTimeout(() => {
      // Slot 1 releases battery (becomes EMPTY)
      setSlots(slots.map(s => {
        if (s.number === 1) {
          return { ...s, status: 'EMPTY', soc: 0, doorLocked: false, description: 'Trống (đã nhả)' };
        }
        return s;
      }));
      setStep(4);
      setLoading(false);
    }, 1000);
  };

  const handleReset = () => {
    setSlots([
      { number: 1, status: 'READY', soc: 100, doorLocked: true, description: 'Pin đầy sẵn sàng' },
      { number: 2, status: 'CHARGING', soc: 68, doorLocked: true, description: 'Đang sạc nhanh' },
      { number: 3, status: 'EMPTY', soc: 0, doorLocked: true, description: 'Slot trống chờ pin' },
    ]);
    setStep(1);
  };

  return (
    <div className="flex flex-col gap-6 text-left max-w-5xl">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <ArrowLeftRight className="h-6 w-6 text-green-600" />
          <span>Thao tác kỹ thuật Đổi Pin</span>
        </h2>
        <p className="text-sm text-slate-550 dark:text-slate-400 mt-1">
          Quy trình hướng dẫn kỹ thuật viên / nhân viên trạm thực hiện tháo lắp và đồng bộ dữ liệu pin.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Visual Cabin Grid */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
          <h3 className="font-bold text-xs uppercase text-slate-450 tracking-wider flex items-center gap-1.5">
            <Cpu className="h-4 w-4 text-slate-400" />
            <span>Mô phỏng Cabin đổi sạc</span>
          </h3>

          <div className="flex flex-col gap-4 mt-2">
            {slots.map((slot) => (
              <div
                key={slot.number}
                className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
                  slot.status === 'READY'
                    ? 'border-green-300 bg-green-50/20 dark:border-green-900/40 dark:bg-green-950/10 shadow-sm shadow-green-100/10'
                    : slot.status === 'CHARGING'
                    ? 'border-yellow-300 bg-yellow-50/20 dark:border-yellow-900/40 dark:bg-yellow-950/10'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex flex-col gap-0.5 text-xs">
                  <span className="font-bold text-sm text-slate-800 dark:text-slate-100">Slot {slot.number}</span>
                  <span className="text-slate-500">{slot.description}</span>
                </div>
                <div className="flex items-center gap-3">
                  {slot.soc > 0 && (
                    <span className={`text-xs font-black ${slot.soc > 80 ? 'text-green-600' : 'text-yellow-605'}`}>
                      {slot.soc}% SoC
                    </span>
                  )}
                  <Badge variant={slot.doorLocked ? 'gray' : 'warning'}>
                    {slot.doorLocked ? 'Cửa khóa' : 'Cửa mở'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Dynamic swap process cards */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col gap-6">
          {/* Timeline steps header */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-4">
            <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-wider">
              <span className={step >= 1 ? 'text-green-600 dark:text-green-400' : 'text-slate-400'}>1. Mở Cửa Nhận Pin</span>
              <ChevronRight className="h-3 w-3 text-slate-300" />
              <span className={step >= 2 ? 'text-green-600 dark:text-green-400' : 'text-slate-400'}>2. Nhập Cảm Biến</span>
              <ChevronRight className="h-3 w-3 text-slate-300" />
              <span className={step >= 3 ? 'text-green-600 dark:text-green-400' : 'text-slate-400'}>3. Nhả Pin Sẵn Sàng</span>
              <ChevronRight className="h-3 w-3 text-slate-300" />
              <span className={step >= 4 ? 'text-green-600 dark:text-green-400' : 'text-slate-400'}>4. Hoàn Tất</span>
            </div>
          </div>

          {/* Action bodies */}
          {step === 1 && (
            <div className="flex flex-col items-center text-center gap-4 py-6 max-w-md mx-auto animate-fadeIn">
              <Unlock className="h-12 w-12 text-yellow-600 animate-pulse" />
              <div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">Bước 1: Mở khóa slot trống tiếp nhận</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Bấm kích hoạt để mở khóa cabin trống (Slot 3) giúp tiếp nhận cục pin cạn của khách hàng.
                </p>
              </div>
              <Button onClick={handleOpenEmptySlot} loading={loading} className="w-full mt-2">
                Mở khóa Slot 3 trống
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col items-center text-center gap-4 py-6 max-w-md mx-auto animate-fadeIn">
              <Cpu className="h-12 w-12 text-blue-600 animate-pulse" />
              <div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">Bước 2: Cắm pin yếu của khách</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Đang chờ kỹ thuật viên cắm cục pin yếu của khách hàng (12% SoC) vào Slot 3 trống vừa mở cửa.
                </p>
              </div>
              <Button onClick={handleInsertOldBattery} loading={loading} variant="primary" className="w-full mt-2">
                Mô phỏng cảm biến: Đã cắm pin vào Slot 3
              </Button>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col items-center text-center gap-4 py-6 max-w-md mx-auto animate-fadeIn">
              <Sparkles className="h-12 w-12 text-green-600" />
              <div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">Bước 3: Nhả pin sạc đầy</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Hệ thống ghi nhận Slot 3 đã khóa chốt sạc. Bây giờ chuẩn bị nhả khóa pin đầy tại Slot 1 (100% SoC) để khách hàng lấy đi.
                </p>
              </div>
              <Button onClick={handleDispenseNewBattery} loading={loading} className="w-full mt-2">
                Kích hoạt nhả pin đầy (Slot 1)
              </Button>
            </div>
          )}

          {step === 4 && (
            <div className="flex flex-col items-center text-center gap-4 py-4 max-w-md mx-auto animate-fadeIn">
              <CheckCircle2 className="h-14 w-14 text-green-600" />
              <div>
                <h3 className="font-bold text-xl text-slate-900 dark:text-white">Đổi pin thành công!</h3>
                <p className="text-sm text-slate-550 dark:text-slate-400 mt-1">
                  Giao dịch đổi pin hoàn tất. Các chỉ số pin và hóa đơn đã được cập nhật thành công lên server.
                </p>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-xs w-full text-left flex flex-col gap-2.5 my-3">
                <h4 className="font-bold text-xs uppercase text-slate-450 tracking-wider flex items-center gap-1.5">
                  <Receipt className="h-4 w-4" />
                  <span>Biên nhận giao dịch</span>
                </h4>
                <div className="flex justify-between">
                  <span className="text-slate-500">Mã giao dịch:</span>
                  <span className="font-mono font-bold">TX-SWAP-9812</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Thu hồi pin cũ:</span>
                  <span>Slot 3 (SoC 12%)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Cung cấp pin mới:</span>
                  <span className="text-green-600 font-bold">Slot 1 (SoC 100%)</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-green-650 dark:text-green-400 border-t border-slate-205 dark:border-slate-800 pt-2">
                  <span>Khấu trừ số dư ví:</span>
                  <span>45,000 VND</span>
                </div>
              </div>

              <Button onClick={handleReset} variant="outline" className="w-full mt-2">
                Thực hiện swap tiếp theo
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default ProcessSwap;
