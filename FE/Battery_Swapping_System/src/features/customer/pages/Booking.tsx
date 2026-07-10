import { useState, type FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBookingStore } from '../../../store/bookingStore';
import { BookingForm } from '../components/BookingForm';
import { Button } from '../../../components/ui/Button';
import { Calendar, CheckCircle2, MapPin, Bike, Clock, CreditCard } from 'lucide-react';

export const Booking: FC = () => {
  const { selectedStation, setActiveBooking, clearBookingState } = useBookingStore();
  const [success, setSuccess] = useState(false);
  const [bookingDetails, setBookingDetails] = useState<any>(null);
  const navigate = useNavigate();

  const handleBookingSubmit = (data: { vehicleName: string; timeSlot: string; costEstimate: number }) => {
    if (!selectedStation) return;

    const details = {
      id: 'bk-' + Math.floor(Math.random() * 9000 + 1000),
      userId: 'u-1',
      stationId: selectedStation.id,
      stationName: selectedStation.name,
      stationAddress: selectedStation.address,
      vehicleName: data.vehicleName,
      timeSlot: data.timeSlot,
      costEstimate: data.costEstimate,
      status: 'PENDING',
      expiryTime: new Date(Date.now() + 30 * 60000).toISOString(), // 30 minutes
      createdAt: new Date().toISOString(),
    };

    setBookingDetails(details);
    setActiveBooking(details as any);
    setSuccess(true);
  };

  const handleClear = () => {
    clearBookingState();
    setBookingDetails(null);
    setSuccess(false);
  };

  return (
    <div className="max-w-2xl mx-auto py-4 text-left">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-green-55 dark:bg-green-950/30 text-green-600 dark:text-green-400 rounded-lg">
          <Calendar className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Đặt chỗ giữ slot pin
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Đặt giữ trước pin đầy trước khi di chuyển tới trạm</p>
        </div>
      </div>

      {success && bookingDetails ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-md flex flex-col gap-6 animate-fadeIn">
          <div className="flex items-center gap-3 text-green-600 dark:text-green-500 border-b border-slate-100 dark:border-slate-850 pb-4">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
            <div>
              <h2 className="text-xl font-bold">Yêu cầu đặt giữ thành công!</h2>
              <span className="text-xs text-slate-500">Mã booking: <strong className="font-mono font-bold">{bookingDetails.id}</strong></span>
            </div>
          </div>

          <p className="text-sm text-slate-655 dark:text-slate-350">
            Hệ thống đã chuẩn bị pin và khóa giữ 1 slot sẵn sàng cho bạn tại trạm. Chi tiết thông tin đặt lịch:
          </p>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl flex items-start gap-3">
              <MapPin className="h-5 w-5 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <span className="block text-xs font-semibold uppercase text-slate-400">Trạm sạc</span>
                <span className="text-sm font-bold block mt-0.5 text-slate-800 dark:text-slate-100">{bookingDetails.stationName}</span>
                <span className="text-xs text-slate-500">{bookingDetails.stationAddress}</span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl flex items-start gap-3">
              <Bike className="h-5 w-5 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <span className="block text-xs font-semibold uppercase text-slate-400">Thông tin xe cắm</span>
                <span className="text-sm font-bold block mt-0.5 text-slate-850 dark:text-slate-100">{bookingDetails.vehicleName}</span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl flex items-start gap-3">
              <Clock className="h-5 w-5 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <span className="block text-xs font-semibold uppercase text-slate-400">Khung giờ nhận pin</span>
                <span className="text-sm font-bold block mt-0.5 text-slate-850 dark:text-slate-100">{bookingDetails.timeSlot}</span>
                <span className="text-xs text-red-500 block mt-1 font-semibold">
                  Tự động hủy sau: {new Date(bookingDetails.expiryTime).toLocaleTimeString()}
                </span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl flex items-start gap-3">
              <CreditCard className="h-5 w-5 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <span className="block text-xs font-semibold uppercase text-slate-400">Tổng chi phí dự kiến</span>
                <span className="text-sm font-black block mt-0.5 text-green-600 dark:text-green-400">
                  {bookingDetails.costEstimate.toLocaleString()} VND
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-2 border-t border-slate-100 dark:border-slate-850 pt-6">
            <Button variant="outline" onClick={handleClear} className="w-full">
              Đặt chỗ mới
            </Button>
            <Button variant="primary" onClick={() => navigate('/payment')} className="w-full">
              Thanh toán & Nạp ví
            </Button>
          </div>
        </div>
      ) : selectedStation ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <BookingForm
            station={selectedStation}
            onSubmit={handleBookingSubmit}
            onCancel={() => navigate('/stations')}
          />
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-2xl p-8 text-center flex flex-col items-center gap-4">
          <p className="text-sm text-slate-500">
            Bạn chưa chọn trạm sạc nào. Vui lòng quay lại danh sách trạm sạc.
          </p>
          <Button onClick={() => navigate('/stations')}>Chọn trạm sạc</Button>
        </div>
      )}
    </div>
  );
};
export default Booking;
