import { useEffect, useState, type FormEvent } from 'react';
import { Input } from '../../../../components/ui/Input';
import { Button } from '../../../../components/ui/Button';
import { adminService } from '../../../../services/adminService';

export const SystemConfig = () => {
  const [swapPrice, setSwapPrice] = useState('');
  const [bookingLimit, setBookingLimit] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const settings = await adminService.getSettings();
    const values = new Map(settings.map((item) => [item.key, item.value]));
    const storedSwapPrice = values.get('STANDARD_SWAP_PRICE');
    const storedBookingLimit = values.get('BOOKING_EXPIRY_MINUTES');
    setSwapPrice(storedSwapPrice ?? '');
    setBookingLimit(storedBookingLimit ?? '');
    if (!storedSwapPrice || !storedBookingLimit) {
      setError('Database đang thiếu STANDARD_SWAP_PRICE hoặc BOOKING_EXPIRY_MINUTES. Hãy nhập giá trị thật trước khi lưu.');
    }
  };

  useEffect(() => {
    void load().catch((cause) => setError(cause instanceof Error ? cause.message : 'Không thể tải cấu hình'));
  }, []);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await Promise.all([
        adminService.updateSetting('STANDARD_SWAP_PRICE', swapPrice),
        adminService.updateSetting('BOOKING_EXPIRY_MINUTES', bookingLimit),
      ]);
      setMessage('Đã lưu cấu hình vào MongoDB.');
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể lưu cấu hình');
    } finally {
      setSaving(false);
    }
  };

  return <div className="max-w-5xl space-y-6 text-left">
    <div><h2 className="text-2xl font-bold">Cấu hình hệ thống</h2><p className="text-sm text-slate-500">Tham số được đọc và lưu trực tiếp trong MongoDB.</p></div>
    {error && <p className="bg-red-50 p-3 text-red-700">{error}</p>}
    {message && <p className="bg-green-50 p-3 text-green-700">{message}</p>}
    <form onSubmit={save} className="grid gap-4 rounded-xl border bg-white p-5 dark:bg-slate-900 sm:grid-cols-2">
      <Input label="Đơn giá đổi pin (VND)" type="number" min={0} value={swapPrice} onChange={(event) => setSwapPrice(event.target.value)} required />
      <Input label="Thời gian giữ chỗ (phút)" type="number" min={1} value={bookingLimit} onChange={(event) => setBookingLimit(event.target.value)} required />
      <Button type="submit" loading={saving} disabled={!swapPrice || !bookingLimit}>Lưu cấu hình</Button>
    </form>
  </div>;
};

export default SystemConfig;
