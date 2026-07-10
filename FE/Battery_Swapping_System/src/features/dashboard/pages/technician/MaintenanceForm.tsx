import { useState, useEffect, type FC, type FormEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { Input } from '../../../../components/ui/Input';
import { Dropdown } from '../../../../components/ui/Dropdown';
import { Button } from '../../../../components/ui/Button';
import { ClipboardList, CheckCircle2, Info } from 'lucide-react';

export const MaintenanceForm: FC = () => {
  const location = useLocation();
  const stateData = location.state as { batteryId?: string; soh?: number; soc?: number; notes?: string } | null;

  const [batteryId, setBatteryId] = useState('');
  const [soh, setSoh] = useState('');
  const [soc, setSoc] = useState('');
  const [status, setStatus] = useState('READY');
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (stateData) {
      if (stateData.batteryId) setBatteryId(stateData.batteryId);
      if (stateData.soh !== undefined) setSoh(stateData.soh.toString());
      if (stateData.soc !== undefined) setSoc(stateData.soc.toString());
      if (stateData.notes) setNotes(stateData.notes);
      // Prepopulate state status if needed, defaults to MAINTENANCE since coming from error
      setStatus('MAINTENANCE');
    }
  }, [stateData]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!batteryId) return;

    console.log('Maintenance record logged:', { batteryId, soh, soc, status, notes });
    setSubmitted(true);
  };

  const statusOptions = [
    { value: 'READY', label: 'Ready - Khả dụng đổi' },
    { value: 'CHARGING', label: 'Charging - Đang sạc' },
    { value: 'MAINTENANCE', label: 'Maintenance - Đang sửa' },
    { value: 'FAULTY', label: 'Faulty - Hỏng hóc nặng' },
  ];

  return (
    <div className="flex flex-col gap-6 text-left max-w-xl">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-550 rounded-lg">
          <ClipboardList className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            Ghi chép bảo trì Pin
          </h2>
          <p className="text-sm text-slate-550 dark:text-slate-400 mt-0.5">
            Cập nhật chỉ số kỹ thuật của pin sau khi hoàn tất kiểm tra phần cứng hoặc sạc thử nghiệm.
          </p>
        </div>
      </div>

      {stateData?.batteryId && !submitted && (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900/30 rounded-xl flex items-start gap-2.5 text-xs text-yellow-800 dark:text-yellow-300">
          <Info className="h-5 w-5 text-yellow-600 flex-shrink-0" />
          <p>
            Bạn đang xử lý phiếu bảo trì cho pin: <strong className="font-mono text-sm">{stateData.batteryId}</strong>.
            Thông số báo cáo lỗi ban đầu đã được tự động điền bên dưới.
          </p>
        </div>
      )}

      {submitted ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-xl p-6 shadow-sm flex flex-col gap-4 text-center items-center">
          <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-555 animate-bounce" />
          <div>
            <h3 className="font-bold text-lg text-slate-900 dark:text-white">Ghi nhận bảo trì thành công</h3>
            <p className="text-sm text-slate-550 mt-1">
              Trạng thái kỹ thuật của Pin <span className="font-mono font-bold">{batteryId}</span> đã được lưu trữ.
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => {
              setSubmitted(false);
              setBatteryId('');
              setSoh('');
              setSoc('');
              setNotes('');
            }}
          >
            Tạo phiếu khác
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm flex flex-col gap-4">
          <Input
            label="ID bộ Pin"
            placeholder="Ví dụ: b-101"
            value={batteryId}
            onChange={(e) => setBatteryId(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Chỉ số SoH hiện tại (%)"
              type="number"
              min={0}
              max={100}
              placeholder="Ví dụ: 95"
              value={soh}
              onChange={(e) => setSoh(e.target.value)}
              required
            />
            <Input
              label="Chỉ số SoC hiện tại (%)"
              type="number"
              min={0}
              max={100}
              placeholder="Ví dụ: 80"
              value={soc}
              onChange={(e) => setSoc(e.target.value)}
              required
            />
          </div>

          <Dropdown
            label="Phân loại trạng thái pin"
            options={statusOptions}
            selectedValue={status}
            onChange={(val) => setStatus(val)}
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Mô tả chi tiết hạng mục sửa chữa
            </label>
            <textarea
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-650 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
              rows={3}
              placeholder="Nội dung kiểm tra, ví dụ: Thay thế cáp cảm biến nhiệt độ, sạc xả ổn định."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <Button type="submit" variant="primary" className="w-full mt-2">
            Lưu phiếu bảo trì
          </Button>
        </form>
      )}
    </div>
  );
};
export default MaintenanceForm;
