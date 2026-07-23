import { useEffect, useState, type FC, type FormEvent } from 'react';
import { Car, ShieldCheck } from 'lucide-react';
import type { Station } from '../../../types';
import { bookingService, type CreateBookingInput, type VehicleOption } from '../../../services/bookingService';
import { stationService, type AvailabilityResult } from '../../../services/stationService';
import { Button } from '../../../components/ui/Button';
import { Dropdown } from '../../../components/ui/Dropdown';

interface BookingFormProps {
  station: Station;
  onSubmit: (data: CreateBookingInput) => Promise<void>;
  onCancel: () => void;
}

const localDateTime = (date: Date) => {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

export const BookingForm: FC<BookingFormProps> = ({ station, onSubmit, onCancel }) => {
  const initialStart = new Date(Date.now() + 24 * 60 * 60_000);
  initialStart.setMinutes(0, 0, 0);
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [vehicleId, setVehicleId] = useState('');
  const [startsAt, setStartsAt] = useState(localDateTime(initialStart));
  const [endsAt, setEndsAt] = useState(localDateTime(new Date(initialStart.getTime() + 60 * 60_000)));
  const [availability, setAvailability] = useState<AvailabilityResult[]>([]);
  const [slotId, setSlotId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    bookingService.getMyVehicles().then((items) => {
      setVehicles(items);
      setVehicleId(items[0]?.id ?? '');
    }).catch(() => setError('Không thể tải danh sách ô tô của bạn.'));
  }, []);

  const checkAvailability = async () => {
    if (!vehicleId || !startsAt || !endsAt) return;
    setLoading(true);
    setError('');
    try {
      const result = await stationService.getAvailability(station.id, vehicleId, new Date(startsAt).toISOString(), new Date(endsAt).toISOString());
      setAvailability(result);
      setSlotId(result.flatMap((item) => item.slots)[0]?.id ?? '');
      if (!result.length) setError('Trạm không còn khung giờ và bộ pin tương thích trong thời gian đã chọn.');
    } catch {
      setError('Không thể kiểm tra khung giờ còn trống.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!vehicleId || !slotId) return;
    setLoading(true);
    setError('');
    try {
      await onSubmit({
        vehicleId,
        stationId: station.id,
        slotId,
        scheduledStart: new Date(startsAt).toISOString(),
        scheduledEnd: new Date(endsAt).toISOString(),
      });
    } catch {
      setError('Không thể tạo lịch thay pin. Khung giờ hoặc pin có thể vừa được người khác giữ.');
    } finally {
      setLoading(false);
    }
  };

  const slots = availability.flatMap((item) => item.slots);
  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 text-left">
      <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-white">
        <Car className="h-5 w-5 text-green-600" />
        Đặt lịch thay bộ pin ô tô điện
      </div>
      <Dropdown
        label="Chọn ô tô"
        options={vehicles.map((vehicle) => ({ value: vehicle.id, label: `${vehicle.name} (${vehicle.plateNumber})` }))}
        selectedValue={vehicleId}
        onChange={(value) => { setVehicleId(value); setAvailability([]); setSlotId(''); }}
      />
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="text-sm font-semibold">Bắt đầu<input className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-800" type="datetime-local" step="3600" value={startsAt} onChange={(event) => { const value = event.target.value; setStartsAt(value); setEndsAt(localDateTime(new Date(new Date(value).getTime() + 60 * 60_000))); setAvailability([]); setSlotId(''); }} /></label>
        <label className="text-sm font-semibold">Kết thúc<input className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-800" type="datetime-local" value={endsAt} readOnly /></label>
      </div>
      <Button type="button" variant="outline" loading={loading} onClick={checkAvailability}>Kiểm tra khung giờ và pin tương thích</Button>
      {slots.length > 0 && <div className="rounded-xl border border-green-200 bg-green-50 p-4 dark:bg-green-950/20">
        <div className="mb-3 flex items-center gap-2 text-sm font-bold text-green-700"><ShieldCheck className="h-5 w-5" />Hệ thống đã xác nhận pin an toàn và tương thích</div>
        <Dropdown label="Khung giờ khả dụng" options={slots.map((slot) => ({ value: slot.id, label: `Khung ${slot.slotNumber} — ${slot.batteries.length} bộ pin` }))} selectedValue={slotId} onChange={setSlotId} />
      </div>}
      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
      <div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={onCancel}>Hủy</Button><Button type="submit" loading={loading} disabled={!slotId}>Tạo lịch thay pin</Button></div>
    </form>
  );
};
