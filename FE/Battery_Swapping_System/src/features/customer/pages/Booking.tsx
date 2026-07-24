import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Car, MapPin, Calendar, CheckCircle2, AlertTriangle, Clock, CreditCard, ChevronRight } from 'lucide-react';
import { bookingService, type BookingQuote, type CreateBookingInput } from '../../../services/bookingService';
import { memberService, type VehicleView } from '../../../services/memberService';
import { vehicleService } from '../../../services/vehicleService';
import { stationService, type AvailableBookingDates, type GroupedTimeSlot } from '../../../services/stationService';
import type { Station } from '../../../types';
import type { Vehicle } from '../../../types/vehicle';
import { ApiClientError, getApiErrorMessage } from '../../../services/apiClient';
import { Button } from '../../../components/ui/Button';
import { LoadingSpinner } from '../../../components/feedback/LoadingSpinner';

const extractBatteryCode = (code: string | undefined | null) => {
  if (!code) return 'Chưa có Pin';
  if (code.includes('batteryCode=')) {
    const match = code.match(/batteryCode=([^&]*)/);
    if (match && match[1]) return match[1];
  }
  return code.split('/').pop() || code;
};

const nextHourValue = () => {
  const date = new Date();
  date.setHours(date.getHours() + 2, 0, 0, 0);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}:00`;
};

const weekdayLabels: Record<string, string> = {
  MON: 'Thứ 2',
  TUE: 'Thứ 3',
  WED: 'Thứ 4',
  THU: 'Thứ 5',
  FRI: 'Thứ 6',
  SAT: 'Thứ 7',
  SUN: 'Chủ nhật',
};
const orderedWeekdays = Object.keys(weekdayLabels);
const formatWorkingDays = (workingDays: string[]) => {
  const selected = orderedWeekdays.filter((day) => workingDays.includes(day));
  if (!selected.length) return 'Chưa thiết lập';
  const indexes = selected.map((day) => orderedWeekdays.indexOf(day));
  const consecutive = indexes.every((value, index) => index === 0 || value === indexes[index - 1] + 1);
  if (consecutive && selected.length > 1) {
    return `${weekdayLabels[selected[0]]} – ${weekdayLabels[selected.at(-1)!]}`;
  }
  return selected.map((day) => weekdayLabels[day]).join(', ');
};

export const Booking = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const requestId = params.get('requestId');
  const [vehicles, setVehicles] = useState<VehicleView[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [vehicleId, setVehicleId] = useState(params.get('vehicleId') ?? '');
  const [stationId, setStationId] = useState(params.get('stationId') ?? '');
  const [startsAt, setStartsAt] = useState(nextHourValue);
  const [endsAt, setEndsAt] = useState('');
  const [selectedSlotKey, setSelectedSlotKey] = useState('');
  const [scheduleDate, setScheduleDate] = useState(() => nextHourValue().slice(0, 10));
  const [durationMinutes] = useState<60>(60);
  const [timeRange, setTimeRange] = useState<'all' | 'morning' | 'afternoon' | 'evening'>('all');
  const [timeSlots, setTimeSlots] = useState<GroupedTimeSlot[]>([]);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [stationSchedule, setStationSchedule] = useState<AvailableBookingDates | null>(null);
  const [availabilityStationId, setAvailabilityStationId] = useState('');
  const [datesLoading, setDatesLoading] = useState(false);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [quote, setQuote] = useState<BookingQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [quoting, setQuoting] = useState(false);
  const [error, setError] = useState('');
  const [reason, setReason] = useState('');
  const [fullVehicle, setFullVehicle] = useState<Vehicle | null>(null);
  const confirmationRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (vehicleId) {
      vehicleService.getVehicleById(vehicleId).then(setFullVehicle).catch(() => setFullVehicle(null));
    } else {
      setFullVehicle(null);
    }
  }, [vehicleId]);

  useEffect(() => {
    Promise.all([memberService.dashboard(true), stationService.getStations()])
      .then(([dashboard, places]) => {
        const cars = dashboard.vehicles;
        const bookableCars = cars.filter((car) => car.status === 'ACTIVE' && car.bookings.length === 0);
        const mandatoryVehicle = requestId ? bookableCars.find((car) => car.replacementRequests.some((request) => request.id === requestId)) : undefined;
        setVehicles(cars);
        setStations(places);
        setVehicleId((value) => mandatoryVehicle?.id || (value && bookableCars.some((car) => car.id === value) ? value : bookableCars[0]?.id || ''));
        setStationId((value) => value || places[0]?.id || '');
      })
      .catch((cause) => setError(getApiErrorMessage(cause)))
      .finally(() => setLoading(false));
  }, [requestId]);

  const vehicle = vehicles.find((item) => item.id === vehicleId);
  const canBookSelectedVehicle = vehicle?.status === 'ACTIVE' && vehicle.bookings.length === 0;
  const battery = vehicle?.batteryAssignments[0]?.battery;
  const request = vehicle?.replacementRequests.find((item) => item.mandatory && !['COMPLETED', 'CANCELLED'].includes(item.status));
  const endIso = useMemo(() => {
    if (endsAt) return new Date(endsAt).toISOString();
    const start = new Date(startsAt);
    return new Date(start.getTime() + durationMinutes * 60_000).toISOString();
  }, [startsAt, endsAt, durationMinutes]);

  const input = (): CreateBookingInput => ({
    vehicleId,
    stationId,
    startAt: new Date(startsAt).toISOString(),
    endAt: endIso,
    ...(request ? { replacementRequestId: request.id } : {}),
    reason: reason.trim() || request?.reason || undefined,
  });

  useEffect(() => {
    if (!stationId) {
      setAvailableDates([]);
      setStationSchedule(null);
      setAvailabilityStationId('');
      return;
    }
    let active = true;
    setDatesLoading(true);
    setAvailabilityStationId('');
    setAvailableDates([]);
    setStationSchedule(null);
    setTimeSlots([]);
    setQuote(null);
    setSelectedSlotKey('');
    setEndsAt('');
    stationService.getAvailableBookingDates(stationId)
      .then((result) => {
        if (!active) return;
        setAvailableDates(result.dates);
        setStationSchedule(result);
        setAvailabilityStationId(stationId);
        setScheduleDate((current) => result.dates.includes(current) ? current : result.dates[0] ?? '');
      })
      .catch((cause) => {
        if (!active) return;
        setAvailabilityStationId(stationId);
        setError(getApiErrorMessage(cause));
      })
      .finally(() => { if (active) setDatesLoading(false); });
    return () => { active = false; };
  }, [stationId]);

  useEffect(() => {
    if (
      !stationId
      || availabilityStationId !== stationId
      || !scheduleDate
      || !availableDates.includes(scheduleDate)
    ) {
      setTimeSlots([]);
      return;
    }
    let active = true;
    setScheduleLoading(true); setError(''); setQuote(null); setSelectedSlotKey(''); setEndsAt('');
    stationService.getAvailableTimeSlots(stationId, scheduleDate)
      .then((result) => { if (active) setTimeSlots(result); })
      .catch((cause) => { if (active) { setTimeSlots([]); setError(getApiErrorMessage(cause)); } })
      .finally(() => { if (active) setScheduleLoading(false); });
    return () => { active = false; };
  }, [stationId, vehicleId, scheduleDate, durationMinutes, canBookSelectedVehicle, availableDates, availabilityStationId]);

  useEffect(() => {
    if (!quote) return;
    const frame = window.requestAnimationFrame(() => {
      confirmationRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [quote]);

  const selectWindow = (window: GroupedTimeSlot) => {
    if (!['AVAILABLE', 'LOW_AVAILABILITY'].includes(window.status) || !canBookSelectedVehicle) return;
    // Preserve the exact ISO instants returned by the API. Converting to a
    // local datetime string and back can shift the instant on clients whose
    // operating-system timezone is not Asia/Ho_Chi_Minh.
    setStartsAt(window.startAt);
    setEndsAt(window.endAt);
    setSelectedSlotKey(`${window.startAt}:${window.endAt}`); setQuote(null);
  };

  const getQuote = async () => {
    if (quoting) return;
    setError('');
    if (vehicle?.status !== 'ACTIVE') {
      setError('Xe đang tắt nên không thể đặt lịch thay pin. Hãy bật lại xe trước.');
      return;
    }
    setQuoting(true);
    try {
      setQuote(await bookingService.quote(input()));
    } catch (cause) {
      if (cause instanceof ApiClientError && cause.status === 409) {
        setTimeSlots(await stationService.getAvailableTimeSlots(stationId, scheduleDate).catch(() => []));
        setSelectedSlotKey('');
        setEndsAt('');
      }
      setError(getApiErrorMessage(cause));
    } finally {
      setQuoting(false);
    }
  };

  const confirm = async () => {
    if (vehicle?.status !== 'ACTIVE') {
      setError('Xe đang tắt nên không thể đặt lịch thay pin. Hãy bật lại xe trước.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const created = await bookingService.create(input());
      memberService.clearDashboardCache();
      navigate(`/app/bookings/${created.id}`);
    } catch (cause) {
      if (cause instanceof ApiClientError && cause.status === 409) {
        setTimeSlots(await stationService.getAvailableTimeSlots(stationId, scheduleDate).catch(() => []));
        setSelectedSlotKey('');
        setEndsAt('');
        setQuote(null);
      }
      setError(getApiErrorMessage(cause));
    } finally {
      setSubmitting(false);
    }
  };

  const selectedWindow = timeSlots.find((item) => `${item.startAt}:${item.endAt}` === selectedSlotKey);

  const filteredWindows = timeSlots.filter((window) => {
    if (timeRange === 'all') return true;
    const hour = Number(window.displayStartTime.split(':')[0]);
    if (timeRange === 'morning') return hour >= 6 && hour < 12;
    if (timeRange === 'afternoon') return hour >= 12 && hour < 18;
    if (timeRange === 'evening') return hour >= 18;
    return true;
  });

  const timeOptions = useMemo(() => {
    const defaultOptions = [
      { value: 'all', label: 'Tất cả các buổi' }
    ];
    if (!stationSchedule?.openingTime || !stationSchedule.closingTime) return defaultOptions;
    const openHour = parseInt(stationSchedule.openingTime.split(':')[0], 10);
    const closeHour = parseInt(stationSchedule.closingTime.split(':')[0], 10);

    const morningStart = Math.max(openHour, 6);
    const morningEnd = Math.min(closeHour, 12);
    if (morningStart < morningEnd && timeSlots.some((slot) => {
      const hour = Number(slot.displayStartTime.split(':')[0]);
      return hour >= morningStart && hour < morningEnd;
    })) {
      defaultOptions.push({ value: 'morning', label: `Buổi sáng (${String(morningStart).padStart(2, '0')}:00 - ${String(morningEnd).padStart(2, '0')}:00)` });
    }

    const afternoonStart = Math.max(openHour, 12);
    const afternoonEnd = Math.min(closeHour, 18);
    if (afternoonStart < afternoonEnd && timeSlots.some((slot) => {
      const hour = Number(slot.displayStartTime.split(':')[0]);
      return hour >= afternoonStart && hour < afternoonEnd;
    })) {
      defaultOptions.push({ value: 'afternoon', label: `Buổi chiều (${String(afternoonStart).padStart(2, '0')}:00 - ${String(afternoonEnd).padStart(2, '0')}:00)` });
    }

    const eveningStart = Math.max(openHour, 18);
    const eveningEnd = Math.min(closeHour, 24);
    if (eveningStart < eveningEnd && timeSlots.some((slot) => {
      const hour = Number(slot.displayStartTime.split(':')[0]);
      return hour >= eveningStart && hour < eveningEnd;
    })) {
      defaultOptions.push({ value: 'evening', label: `Buổi tối (${String(eveningStart).padStart(2, '0')}:00 - ${String(eveningEnd).padStart(2, '0')}:00)` });
    }

    return defaultOptions;
  }, [stationSchedule, timeSlots]);

  useEffect(() => {
    if (!timeOptions.some((option) => option.value === timeRange)) setTimeRange('all');
  }, [timeOptions, timeRange]);

  if (loading) return <LoadingSpinner label="Đang chuẩn bị dữ liệu đặt lịch..." />;

  const steps = [
    { label: 'Xe', id: 1, current: true },
    { label: 'Trạm & Giờ', id: 2, current: vehicleId !== '' },
    { label: 'Khoang & Khung giờ', id: 3, current: Boolean(selectedWindow) },
    { label: 'Xác nhận', id: 4, current: quote !== null }
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white">Đặt lịch thay pin</h1>
          <p className="text-sm text-slate-500 mt-1">Chọn xe, trạm, thời gian và xác nhận thay pin.</p>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold transition-all shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại
        </button>
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-3 rounded-2xl bg-red-50 dark:bg-red-900/30 p-5 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p className="font-medium">{error}</p>
        </div>
      )}

      {/* Steps Indicator */}
      <div className="flex items-center justify-between sm:justify-start gap-2 overflow-x-auto pb-2">
        {steps.map((step, idx) => (
          <div key={step.id} className="flex items-center gap-2 shrink-0">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm transition-colors ${step.current ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
              }`}>
              {step.id}
            </div>
            <span className={`text-sm font-bold ${step.current ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'}`}>
              {step.label}
            </span>
            {idx < steps.length - 1 && (
              <ChevronRight className={`w-4 h-4 mx-2 ${step.current ? 'text-blue-300' : 'text-slate-200 dark:text-slate-700'}`} />
            )}
          </div>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
              <Car className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold">1. Chọn Ô tô</h2>
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
              Danh sách xe của bạn
              <select
                aria-label="Ô tô của bạn"
                className="mt-2 w-full rounded-xl border-slate-200 bg-slate-50 dark:bg-slate-800 dark:border-slate-700 p-3.5 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition"
                value={vehicleId}
                onChange={(event) => { setVehicleId(event.target.value); setTimeSlots([]); setQuote(null); }}
              >
                {vehicles.map((item) => {
                  const hasActiveBooking = item.bookings.length > 0;
                  return <option key={item.id} value={item.id} disabled={item.status !== 'ACTIVE' || hasActiveBooking}>
                    {item.name} — {item.plateNumber}
                    {item.status !== 'ACTIVE' ? ' (Đã tắt — chỉ xem)' : hasActiveBooking ? ' (Đã có lịch đang xử lý)' : ''}
                  </option>;
                })}
              </select>
            </label>

            {!vehicles.some((item) => item.status === 'ACTIVE' && item.bookings.length === 0) && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                Không có xe khả dụng để đặt lịch. Các xe đang tắt hoặc đã có lịch đang xử lý sẽ không thể chọn lại.
              </div>
            )}


            {fullVehicle && (
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-800/50 shadow-inner">
                <div className="space-y-3">
                  <div className="flex justify-between items-center border-b pb-2 dark:border-slate-700/50 border-slate-200">
                    <span className="text-sm font-semibold text-slate-500">Mẫu xe</span>
                    <span className="font-bold text-slate-900 dark:text-white">{fullVehicle.brand} {fullVehicle.model} ({fullVehicle.manufactureYear})</span>
                  </div>
                  <div className="flex justify-between items-center border-b pb-2 dark:border-slate-700/50 border-slate-200">
                    <span className="text-sm font-semibold text-slate-500">Biển số</span>
                    <span className="font-bold text-slate-900 dark:text-white font-mono">{fullVehicle.plateNumber}</span>
                  </div>
                  <div className="flex justify-between items-center border-b pb-2 dark:border-slate-700/50 border-slate-200">
                    <span className="text-sm font-semibold text-slate-500">Loại pin</span>
                    <span className="font-bold text-slate-900 dark:text-white font-mono">{fullVehicle.batteryType || 'Chưa cập nhật'}</span>
                  </div>
                  <div className="flex justify-between items-center border-b pb-2 dark:border-slate-700/50 border-slate-200">
                    <span className="text-sm font-semibold text-slate-500">Số khung (VIN)</span>
                    <span className="font-bold text-slate-900 dark:text-white font-mono">{fullVehicle.vin || 'Chưa cập nhật'}</span>
                  </div>
                  <div className="flex justify-between items-center border-b pb-2 dark:border-slate-700/50 border-slate-200">
                    <span className="text-sm font-semibold text-slate-500">Màu sắc</span>
                    <span className="font-bold text-slate-900 dark:text-white">{fullVehicle.color || 'Chưa cập nhật'}</span>
                  </div>
                  <div className="flex justify-between items-center border-b pb-2 dark:border-slate-700/50 border-slate-200">
                    <span className="text-sm font-semibold text-slate-500">Số Km (ODO)</span>
                    <span className="font-bold text-slate-900 dark:text-white">{fullVehicle.currentMileageKm?.toLocaleString() ?? 0} km</span>
                  </div>
                </div>

                {battery && (
                  <div className="mt-4 pt-4 border-t-2 border-dashed border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Trạng thái Pin hiện tại</span>
                      <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wider ${battery.soh < 70 || battery.safetyState === 'UNSAFE' ? 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800' :
                        'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800'
                        }`}>
                        {battery.soh < 70 || battery.safetyState === 'UNSAFE' ? 'Yêu cầu thay' : 'An toàn'}
                      </span>
                    </div>
                    <div className="text-sm font-medium space-y-2">
                      <p className="flex justify-between items-center">
                        <span className="text-slate-500">Mã Pin:</span>
                        <span className="font-bold text-slate-900 dark:text-white break-all text-right max-w-[60%]">{extractBatteryCode(battery.serialNumber)}</span>
                      </p>
                      <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-100 dark:border-slate-700">
                        <div className="flex items-center">
                          <span className="text-slate-500 mr-2 text-xs font-bold uppercase tracking-wider">SOH</span>
                          <span className={`text-base font-black ${battery.soh < 70 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>{battery.soh}%</span>
                        </div>
                        <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-2"></div>
                        <div className="flex items-center">
                          <span className="text-slate-500 mr-2 text-xs font-bold uppercase tracking-wider">SOC</span>
                          <span className={`text-base font-black ${battery.soc <= 20 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>{battery.soc}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {!fullVehicle && battery && (
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Trạng thái Pin</span>
                  <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wider ${battery.soh < 70 || battery.safetyState === 'UNSAFE' ? 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800' :
                    'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800'
                    }`}>
                    {battery.soh < 70 || battery.safetyState === 'UNSAFE' ? 'Yêu cầu thay' : 'An toàn'}
                  </span>
                </div>
                <div className="text-sm font-medium">
                  <p className="text-slate-500">Mã Pin: <span className="font-bold text-slate-900 dark:text-white break-all">{extractBatteryCode(battery.serialNumber)}</span></p>
                  <p className="mt-1.5 flex items-center">
                    <span className="text-slate-500 mr-1">SOH:</span> <span className={`font-bold ${battery.soh < 70 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>{battery.soh}%</span>
                    <span className="mx-3 text-slate-300 dark:text-slate-700">|</span>
                    <span className="text-slate-500 mr-1">SOC:</span> <span className={`font-bold ${battery.soc <= 20 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>{battery.soc}%</span>
                  </p>
                </div>
              </div>
            )}

            {request && (
              <div className="mt-4 rounded-xl bg-red-50 dark:bg-red-900/20 p-4 text-red-800 dark:text-red-400 border border-red-200 dark:border-red-800">
                <div className="flex gap-2">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <div>
                    <strong className="block mb-1">Yêu cầu thay pin bắt buộc</strong>
                    <p className="text-sm">{request.reason}</p>
                    <p className="text-sm mt-1 opacity-80">Mức ưu tiên: {request.priority}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <MapPin className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold">2. Trạm & Thời gian</h2>
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
              Trạm thay pin
              <select
                aria-label="Trạm thay pin"
                className="mt-2 w-full rounded-xl border-slate-200 bg-slate-50 dark:bg-slate-800 dark:border-slate-700 p-3.5 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition"
                value={stationId}
                onChange={(event) => { setStationId(event.target.value); setTimeSlots([]); setQuote(null); }}
              >
                {stations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Ngày thay pin
                <input
                  aria-label="Ngày thay pin"
                  type="date"
                  min={stationSchedule?.dateFrom ?? undefined}
                  max={stationSchedule?.dateTo ?? undefined}
                  disabled={datesLoading || !stationSchedule?.dateFrom}
                  className="mt-2 w-full rounded-xl border-slate-200 bg-slate-50 p-3.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800"
                  value={scheduleDate}
                  onChange={(event) => {
                    setScheduleDate(event.target.value);
                    setSelectedSlotKey('');
                    setEndsAt('');
                    setQuote(null);
                  }}
                />
              </label>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Buổi trong ngày
                <select aria-label="Buổi trong ngày" disabled={!timeSlots.length} className="mt-2 w-full rounded-xl border-slate-200 bg-slate-50 p-3.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800" value={timeRange} onChange={(event) => setTimeRange(event.target.value as 'all' | 'morning' | 'afternoon' | 'evening')}>
                  {timeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </label>
            </div>
            {scheduleDate && availabilityStationId === stationId && !availableDates.includes(scheduleDate) && (
              <p className="text-sm font-semibold text-amber-600">
                Ngày đã chọn không có khung giờ hoạt động khả dụng.
              </p>
            )}
            {stationSchedule && (
              <div className="grid gap-2 rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300 sm:grid-cols-2">
                <p><Calendar className="mr-2 inline h-4 w-4" />Ngày hoạt động: <strong>{formatWorkingDays(stationSchedule.workingDays)}</strong></p>
                <p><Clock className="mr-2 inline h-4 w-4" />Giờ mở cửa: <strong>{stationSchedule.openingTime || 'Chưa thiết lập'}</strong> – <strong>{stationSchedule.closingTime || 'Chưa thiết lập'}</strong></p>
              </div>
            )}
          </div>
        </section>
      </div>

      <section className="rounded-3xl border border-emerald-200 bg-emerald-50/50 p-6 shadow-sm dark:border-emerald-800 dark:bg-emerald-900/10">
        <div className="mb-4 flex items-center gap-3"><div className="rounded-lg bg-emerald-100 p-2 text-emerald-600 dark:bg-emerald-900/50"><CheckCircle2 className="h-5 w-5" /></div><div><h2 className="text-lg font-bold text-emerald-800 dark:text-emerald-400">3. Chọn khung giờ đổi pin</h2><p className="text-sm text-emerald-700/80">Chọn khung giờ phù hợp. Khoang đổi pin sẽ được hệ thống tự động phân bổ.</p></div></div>
        {!canBookSelectedVehicle && <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300">Bạn vẫn có thể xem lịch trống. Hãy đăng ký một xe chưa có lịch đang xử lý để chọn khung giờ và đặt lịch.</div>}
        {scheduleLoading ? (
          <LoadingSpinner label="Đang tải các khung giờ..." />
        ) : filteredWindows.length ? (
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {filteredWindows.map((slot) => {
              const full = slot.status === 'FULL';
              const past = slot.status === 'PAST';
              const low = slot.status === 'LOW_AVAILABILITY';
              const disabled = full || past || !canBookSelectedVehicle;
              const key = `${slot.startAt}:${slot.endAt}`;
              const selected = selectedSlotKey === key;
              const label = past ? 'Đã qua giờ' : full ? 'Đã đầy' : low ? 'Sắp đầy' : 'Còn chỗ';
              const badgeStyle = past || full
                ? 'bg-slate-200 text-slate-600'
                : low
                  ? 'bg-orange-100 text-orange-700'
                  : 'bg-emerald-100 text-emerald-700';
              return (
                <button
                  type="button"
                  key={key}
                  disabled={disabled}
                  onClick={() => selectWindow(slot)}
                  className={`relative rounded-2xl border p-4 text-left transition ${
                    selected
                      ? 'border-emerald-600 bg-emerald-50 ring-2 ring-emerald-500/30 dark:bg-emerald-900/30'
                      : disabled
                        ? 'cursor-not-allowed border-slate-200 bg-slate-50 opacity-70 dark:border-slate-800 dark:bg-slate-950/20'
                        : 'border-slate-200 bg-white hover:border-emerald-400 hover:shadow-md dark:border-slate-700 dark:bg-slate-900'
                  }`}
                >
                  {selected && <CheckCircle2 className="absolute right-3 top-3 h-5 w-5 text-emerald-600" />}
                  <div className="flex items-start justify-between gap-3 pr-7">
                    <p className="text-xl font-black text-slate-900 dark:text-white">
                      {slot.displayStartTime}–{slot.displayEndTime}
                    </p>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-black ${badgeStyle}`}>{label}</span>
                  </div>
                  <p className={`mt-3 text-sm font-black ${low ? 'text-orange-700' : 'text-emerald-700'}`}>
                    Còn {slot.availableBays}/{slot.totalBays} khoang
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">{slot.durationMinutes} phút</p>
                  <p className="mt-3 border-t border-slate-100 pt-3 text-xs font-semibold leading-5 text-slate-500 dark:border-slate-800">
                    Khoang và pin thay thế sẽ được trạm phân bổ
                  </p>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed p-8 text-center text-sm font-semibold text-slate-500">
            Không có khung giờ đổi pin cho trạm và ngày đã chọn.
          </div>
        )}
      </section>

      {selectedWindow && (
        <section className="rounded-3xl border border-emerald-200 bg-emerald-50/50 dark:bg-emerald-900/10 dark:border-emerald-800 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-emerald-800 dark:text-emerald-400">Khung giờ đã chọn</h2>
              <p className="text-sm text-emerald-600/80 dark:text-emerald-400/80">{new Date(selectedWindow.startAt).toLocaleDateString('vi-VN')} · {selectedWindow.displayStartTime}–{selectedWindow.displayEndTime}</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end gap-4 mt-4">
            <div className="flex-1 rounded-xl border border-emerald-200 bg-white p-3.5 text-sm font-semibold dark:border-emerald-800 dark:bg-slate-800">Còn {selectedWindow.availableBays}/{selectedWindow.totalBays} khoang · Khoang sẽ được hệ thống tự động phân bổ</div>
            <Button
              className="w-full sm:w-auto justify-center rounded-xl py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 font-bold"
              loading={quoting}
              disabled={quoting}
              onClick={() => void getQuote()}
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Xem phí dịch vụ
            </Button>
          </div>
        </section>
      )}

      {quote && (
        <section ref={confirmationRef} data-testid="booking-quote" className="scroll-mt-24 rounded-3xl border border-blue-200 bg-blue-50/50 dark:bg-blue-900/10 dark:border-blue-800 p-6 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
            <Calendar className="w-32 h-32 text-blue-600" />
          </div>

          <h2 className="text-2xl font-black text-blue-900 dark:text-blue-400 relative z-10">4. Xác nhận Đặt lịch</h2>

          <div className="mt-6 grid sm:grid-cols-2 gap-4 relative z-10">
            <div className="rounded-2xl bg-white dark:bg-slate-800 p-5 border border-slate-100 dark:border-slate-700 shadow-sm">
              <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Thời gian hẹn</span>
              <span className="text-lg font-bold">{new Date(quote.scheduledStart).toLocaleString('vi-VN')}</span>
            </div>

            <div className="rounded-2xl bg-white dark:bg-slate-800 p-5 border border-slate-100 dark:border-slate-700 shadow-sm">
              <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Chi phí dự kiến</span>
              <span className="text-2xl font-black text-blue-600 dark:text-blue-400">{quote.amount.toLocaleString('vi-VN')} {quote.currency}</span>
            </div>
          </div>

          {quote.mandatory && (
            <div className="mt-4 flex flex-wrap items-center gap-3 relative z-10">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800">
                Lịch thay pin bắt buộc
              </span>
            </div>
          )}

          <div className="mt-6 relative z-10">
            <label htmlFor="reason" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Ghi chú / Mô tả thêm (Tùy chọn)</label>
            <textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder={request ? `Yêu cầu tự động: ${request.reason}` : "Ví dụ: Pin có dấu hiệu bị phù, xe đang báo lỗi đèn vàng..."} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"></textarea>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row gap-4 relative z-10 pt-6 border-t border-blue-200 dark:border-blue-800/50">
            <Button
              className="flex-1 justify-center rounded-xl py-4 bg-blue-600 hover:bg-blue-700 text-base font-bold shadow-md hover:shadow-lg transition-all"
              loading={submitting}
              onClick={() => void confirm()}
            >
              <CheckCircle2 className="w-5 h-5 mr-2" />
              Xác nhận & Giữ chỗ
            </Button>
            <Link to="/app/bookings" className="flex-1 sm:flex-none">
              <Button variant="outline" className="w-full justify-center rounded-xl py-4 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-base font-bold transition-all">
                Xem lịch của tôi
              </Button>
            </Link>
          </div>
        </section>
      )}
    </div>
  );
};
