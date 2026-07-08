import { useState, type FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBookingStore } from '../../../store/bookingStore';
import { BookingForm } from '../components/BookingForm';
import { Button } from '../../../components/ui/Button';
import { Calendar, CheckCircle } from 'lucide-react';

export const Booking: FC = () => {
  const { selectedStation, activeBooking, setActiveBooking, clearBookingState } = useBookingStore();
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleBookingSubmit = (data: { expiryMinutes: number }) => {
    if (!selectedStation) return;

    // Build Mock Booking confirmation
    const newBooking = {
      id: 'bk-' + Math.floor(Math.random() * 10000),
      userId: 'u-1',
      stationId: selectedStation.id,
      stationName: selectedStation.name,
      slotNumber: 1,
      status: 'PENDING',
      expiryTime: new Date(Date.now() + data.expiryMinutes * 60000).toISOString(),
      createdAt: new Date().toISOString(),
    } as any;

    setActiveBooking(newBooking);
    setSuccess(true);
  };

  const handleClear = () => {
    clearBookingState();
    setSuccess(false);
  };

  return (
    <div className="max-w-xl mx-auto py-4 text-left">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-500 rounded-lg">
          <Calendar className="h-6 w-6" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Đặt chỗ giữ slot pin
        </h1>
      </div>

      {success && activeBooking ? (
        <div className="flex flex-col gap-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 text-green-600 dark:text-green-500">
            <CheckCircle className="h-8 w-8" />
            <h2 className="text-xl font-bold">Đặt chỗ thành công!</h2>
          </div>
          <p className="text-sm text-slate-550">
            Hệ thống đã giữ lại 1 slot pin đầy cho bạn tại trạm <strong>{activeBooking.stationName}</strong>.
          </p>

          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-sm flex flex-col gap-2">
            <div>
              <span className="text-slate-500">Mã đặt chỗ:</span>{' '}
              <strong className="font-semibold">{activeBooking.id}</strong>
            </div>
            <div>
              <span className="text-slate-500">Thời gian đặt chỗ:</span>{' '}
              <span>{new Date(activeBooking.createdAt).toLocaleTimeString()}</span>
            </div>
            <div>
              <span className="text-slate-550">Hết hạn vào lúc:</span>{' '}
              <strong className="text-red-500">{new Date(activeBooking.expiryTime).toLocaleTimeString()}</strong>
            </div>
          </div>

          <div className="flex gap-3 mt-2">
            <Button variant="outline" onClick={handleClear} className="w-full">
              Đặt chỗ mới
            </Button>
            <Button variant="primary" onClick={() => navigate('/history')} className="w-full">
              Xem lịch sử đặt chỗ
            </Button>
          </div>
        </div>
      ) : selectedStation ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
          <BookingForm
            station={selectedStation}
            onSubmit={handleBookingSubmit}
            onCancel={() => navigate('/stations')}
          />
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center flex flex-col items-center gap-4">
          <p className="text-sm text-slate-550">
            Bạn chưa chọn trạm sạc nào. Vui lòng quay lại danh sách trạm sạc.
          </p>
          <Button onClick={() => navigate('/stations')}>Chọn trạm sạc</Button>
        </div>
      )}
    </div>
  );
};
