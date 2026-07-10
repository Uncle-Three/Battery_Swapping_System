import { useState, type FC, type FormEvent } from 'react';
import type { Station } from '../../../types';
import { Button } from '../../../components/ui/Button';
import { Dropdown } from '../../../components/ui/Dropdown';
import { AlertTriangle, ShieldCheck, Clock, Bike } from 'lucide-react';

interface BookingFormProps {
  station: Station;
  onSubmit: (data: { vehicleName: string; timeSlot: string; costEstimate: number }) => void;
  onCancel: () => void;
}

export const BookingForm: FC<BookingFormProps> = ({ station, onSubmit, onCancel }) => {
  const [step, setStep] = useState(1);
  const [selectedVehicle, setSelectedVehicle] = useState('v-1');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');
  const [checkingCompat, setCheckingCompat] = useState(false);
  const [compatResult, setCompatResult] = useState<'SUCCESS' | 'FAILED' | null>(null);

  const vehicleOptions = [
    { value: 'v-1', label: 'VinFast Feliz S (72V LFP - Pin Đơn)' },
    { value: 'v-2', label: 'VinFast Klara S (72V Lithium - Pin Đôi)' },
    { value: 'v-3', label: 'Yadea Vigor (60V Graphene)' },
  ];

  const timeSlots = [
    { value: '08:00 - 09:00', label: '08:00 - 09:00', available: 3 },
    { value: '09:00 - 10:00', label: '09:00 - 10:00', available: 2 },
    { value: '10:00 - 11:00', label: '10:00 - 11:00', available: 0 },
    { value: '14:00 - 15:00', label: '14:00 - 15:00', available: 5 },
    { value: '15:00 - 16:00', label: '15:00 - 16:00', available: 1 },
  ];

  const getVehicleLabel = () => {
    return vehicleOptions.find(o => o.value === selectedVehicle)?.label || '';
  };

  const handleVehicleCheck = () => {
    setCheckingCompat(true);
    setCompatResult(null);
    setTimeout(() => {
      setCheckingCompat(false);
      // Mock compatibility logic (Yadea is incompatible for standard station batteries in this demo)
      if (selectedVehicle === 'v-3') {
        setCompatResult('FAILED');
      } else {
        setCompatResult('SUCCESS');
      }
    }, 1000);
  };

  const handleNextStep = () => {
    if (step === 1 && compatResult === 'SUCCESS') {
      setStep(2);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!selectedTimeSlot) return;
    
    // VinFast Klara S uses double batteries (double cost)
    const baseCost = selectedVehicle === 'v-2' ? 90000 : 45000;
    onSubmit({
      vehicleName: getVehicleLabel(),
      timeSlot: selectedTimeSlot,
      costEstimate: baseCost,
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Steps indicator */}
      <div className="flex items-center gap-4 text-xs font-semibold uppercase tracking-wider mb-2 border-b border-slate-100 dark:border-slate-800 pb-4">
        <span className={`${step === 1 ? 'text-green-600 dark:text-green-400 font-bold' : 'text-slate-400'}`}>
          Bước 1: Chọn Xe & Check Pin
        </span>
        <span className="text-slate-300">/</span>
        <span className={`${step === 2 ? 'text-green-600 dark:text-green-400 font-bold' : 'text-slate-400'}`}>
          Bước 2: Chọn Khung Giờ & Đặt Giữ
        </span>
      </div>

      {step === 1 && (
        <div className="flex flex-col gap-5 text-left">
          <Dropdown
            label="Chọn xe máy điện của bạn"
            options={vehicleOptions}
            selectedValue={selectedVehicle}
            onChange={(val) => {
              setSelectedVehicle(val);
              setCompatResult(null);
            }}
          />

          <div className="flex flex-col gap-2">
            <Button
              type="button"
              variant="outline"
              loading={checkingCompat}
              onClick={handleVehicleCheck}
              className="w-full flex items-center gap-2"
            >
              <Bike className="h-4 w-4" />
              <span>Kiểm tra độ tương thích của pin tại trạm</span>
            </Button>

            {compatResult === 'SUCCESS' && (
              <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/30 rounded-xl flex items-start gap-3 mt-2 text-sm text-green-800 dark:text-green-300">
                <ShieldCheck className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold">Độ tương thích: 100%</strong>
                  <p className="text-xs text-green-750 dark:text-green-400/80 mt-0.5">
                    Trạm sạc hiện có <strong>{station.slots.filter(s => s.status === 'READY').length} pin</strong> phù hợp với thông số xe của bạn.
                  </p>
                </div>
              </div>
            )}

            {compatResult === 'FAILED' && (
              <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-xl flex items-start gap-3 mt-2 text-sm text-red-800 dark:text-red-300">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold">Không tương thích!</strong>
                  <p className="text-xs text-red-750 dark:text-red-400/80 mt-0.5">
                    Trạm sạc hiện không có loại pin Graphene phù hợp cho thông số xe Yadea. Vui lòng chọn xe khác hoặc trạm khác.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 justify-end mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={onCancel}>
              Hủy
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={compatResult !== 'SUCCESS'}
              onClick={handleNextStep}
            >
              Tiếp tục
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5 text-left animate-fadeIn">
          <div>
            <h4 className="text-xs font-semibold text-slate-450 dark:text-slate-400 uppercase tracking-wider">Trạm và Xe đã chọn</h4>
            <p className="font-bold text-slate-800 dark:text-slate-100 mt-1">{station.name}</p>
            <p className="text-xs text-slate-500">{getVehicleLabel()}</p>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-350 flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-slate-400" />
              <span>Chọn khung giờ lấy pin (Hôm nay)</span>
            </span>
            <div className="grid sm:grid-cols-2 gap-2 mt-1.5">
              {timeSlots.map((slot) => (
                <button
                  key={slot.value}
                  type="button"
                  disabled={slot.available === 0}
                  onClick={() => setSelectedTimeSlot(slot.value)}
                  className={`p-3 border rounded-xl text-left flex justify-between items-center transition-all ${
                    slot.available === 0
                      ? 'opacity-40 cursor-not-allowed bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-800'
                      : selectedTimeSlot === slot.value
                      ? 'border-green-600 bg-green-50/50 dark:border-green-500 dark:bg-green-950/20 text-green-800 dark:text-green-300 ring-2 ring-green-600/20'
                      : 'border-slate-200 hover:border-green-500 hover:bg-green-50/10 dark:border-slate-800 dark:hover:border-green-500 dark:hover:bg-green-950/5'
                  }`}
                >
                  <span className="text-sm font-semibold">{slot.label}</span>
                  <span className="text-xs text-slate-500">
                    {slot.available === 0 ? 'Hết slot' : `${slot.available} slot`}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {selectedTimeSlot && (
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl text-sm flex flex-col gap-2.5">
              <h4 className="font-bold text-xs uppercase text-slate-450 tracking-wider">Ước tính chi phí đặt giữ</h4>
              <div className="flex justify-between">
                <span className="text-slate-500">Đơn giá đổi pin ({selectedVehicle === 'v-2' ? 'Pin đôi' : 'Pin đơn'}):</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100">
                  {(selectedVehicle === 'v-2' ? 90000 : 45000).toLocaleString()} VND
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-200 dark:border-slate-700/50 pt-2 font-bold text-green-600 dark:text-green-400">
                <span>Phí dự kiến:</span>
                <span>{(selectedVehicle === 'v-2' ? 90000 : 45000).toLocaleString()} VND</span>
              </div>
            </div>
          )}

          <div className="flex gap-3 justify-end mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setStep(1)}>
              Quay lại
            </Button>
            <Button type="submit" variant="primary" disabled={!selectedTimeSlot}>
              Xác nhận Đặt Giữ
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};
