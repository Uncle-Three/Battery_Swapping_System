import { useState, type FC, type FormEvent } from 'react';
import type { Station } from '../../../types';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';

interface BookingFormProps {
  station: Station;
  onSubmit: (data: { expiryMinutes: number }) => void;
  onCancel: () => void;
}

export const BookingForm: FC<BookingFormProps> = ({ station, onSubmit, onCancel }) => {
  const [expiryMinutes, setExpiryMinutes] = useState(15);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({ expiryMinutes });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <h4 className="text-sm font-semibold text-slate-500 dark:text-slate-400">Trạm đã chọn</h4>
        <p className="font-bold text-slate-800 dark:text-slate-100">{station.name}</p>
        <p className="text-xs text-slate-500">{station.address}</p>
      </div>

      <Input
        label="Thời gian giữ slot tối đa (phút)"
        type="number"
        min={5}
        max={60}
        value={expiryMinutes}
        onChange={(e) => setExpiryMinutes(parseInt(e.target.value) || 15)}
        required
      />

      <p className="text-xs text-slate-500 dark:text-slate-400 italic">
        * Lưu ý: Sau thời gian này, slot đặt chỗ sẽ tự động bị hủy và giải phóng cho người khác nếu bạn không tới trạm nhận pin.
      </p>

      <div className="flex gap-3 justify-end mt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Hủy bỏ
        </Button>
        <Button type="submit" variant="primary">
          Xác nhận đặt giữ
        </Button>
      </div>
    </form>
  );
};
