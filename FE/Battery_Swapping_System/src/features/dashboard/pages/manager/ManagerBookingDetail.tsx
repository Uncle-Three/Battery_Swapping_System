import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { managerBookingService, type ManagerBooking } from '../../../../services/managerBookingService';
import { stationService } from '../../../../services/stationService';
import { getApiErrorMessage } from '../../../../services/apiClient';
import { LoadingSpinner } from '../../../../components/feedback/LoadingSpinner';
import { Button } from '../../../../components/ui/Button';
import { 
  ChevronLeft, CalendarCheck, Clock, User, AlertCircle, 
  CheckCircle2, XCircle, MapPin, Zap, ShieldAlert, FileText, Check, Car 
} from 'lucide-react';
import { statusLabel } from '../../../../utils/viLabels';

type Slot = { id: string; slotNumber: number };

const extractBatteryCode = (code: string | undefined | null) => {
  if (!code) return '-';
  if (code.includes('batteryCode=')) {
    const match = code.match(/batteryCode=([^&]*)/);
    if (match && match[1]) return match[1];
  }
  return code.split('/').pop() || code;
};

const inputClass = 'mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white';

export const ManagerBookingDetail = () => {
  const { bookingId = '' } = useParams(); 
  const navigate = useNavigate(); 
  const location = useLocation();
  const approvalRoot = location.pathname.startsWith('/admin/') ? '/admin/booking-approvals' : '/manager/approvals';
  
  const [item, setItem] = useState<ManagerBooking | null>(null); 
  const [, setSlots] = useState<Slot[]>([]); 
  const [error, setError] = useState(''); 
  const [success, setSuccess] = useState(''); 
  const [busy, setBusy] = useState(false);
  const [rejectReason, setRejectReason] = useState(''); 
  
  const load = useCallback(async () => { 
    try { 
      const booking = await managerBookingService.details(bookingId); 
      setItem(booking); 
      const stationSlots = await stationService.getStationSlots(booking.station.id) as Slot[]; 
      setSlots(stationSlots); 
    } catch (cause) { 
      setError(getApiErrorMessage(cause, 'Không thể tải thông tin booking.')); 
    } 
  }, [bookingId]);
  
  useEffect(() => { void load(); }, [load]);
  
  const act = async (action: () => Promise<unknown>, message: string) => { 
    setBusy(true); setError(''); setSuccess(''); 
    try { 
      await action(); 
      setSuccess(message); 
      await load(); 
    } catch (cause) { 
      setError(getApiErrorMessage(cause, 'Đã xảy ra lỗi khi thực hiện thao tác.')); 
    } finally { 
      setBusy(false); 
    } 
  };
  
  if (!item && !error) return <LoadingSpinner label="Đang tải chi tiết booking..." />;
  if (!item) return <div className="p-6"><p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">{error}</p></div>;
  
  const currentBattery = item.vehicle?.batteryAssignments?.[0]?.battery;
  
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 pb-12">
      <div>
        <button onClick={() => navigate(approvalRoot)} className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-emerald-600 transition-colors">
          <ChevronLeft className="h-4 w-4" /> Quay lại danh sách
        </button>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end justify-between">
          <div>
            <p className="eyebrow flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
              <MapPin className="h-3.5 w-3.5" /> {item.station?.name ?? 'Trạm thay pin'}
            </p>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Chi tiết lịch thay pin <span className="text-emerald-600">#{item.id.slice(-6).toUpperCase()}</span></h1>
          </div>
          <span className={`w-fit rounded-full px-4 py-1.5 text-xs font-extrabold shadow-sm
            ${item.status === 'PENDING_APPROVAL' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30' : 
              item.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30' : 
              item.status === 'REJECTED' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30' : 
              'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}>
            {statusLabel(item.status)}
          </span>
        </div>
      </div>

      {error && <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700 shadow-sm dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
      {success && <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700 shadow-sm dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-400"><CheckCircle2 className="h-5 w-5" />{success}</div>}
      
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="flex items-center gap-2 text-lg font-extrabold text-slate-900 dark:text-white">
              <CalendarCheck className="h-5 w-5 text-emerald-600" /> Lịch trình & Dịch vụ
            </h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-100 p-4 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Thời gian dự kiến</p>
                <p className="mt-2 font-extrabold text-slate-900 dark:text-white">{item.scheduledStart ? new Date(item.scheduledStart).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'}</p>
              </div>
              <div className="rounded-xl border border-slate-100 p-4 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5"><Zap className="h-3.5 w-3.5" /> Phân bổ Vị trí / Pin</p>
                {item.serviceBay && <p className="mt-2 font-extrabold text-slate-900 dark:text-white">Khoang: {item.serviceBay.bayName.replace(/^Khoang\s*/i, '')}</p>}
                {item.slot && <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-400">Khay pin: <span className="font-mono font-bold">{item.slot.slotNumber}</span></p>}
                {item.battery && <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-400">Pin: <span className="font-mono font-bold">{extractBatteryCode(item.battery.serialNumber)}</span></p>}
              </div>
              <div className="sm:col-span-2 rounded-xl border border-slate-100 p-4 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> Mô tả / Yêu cầu thay pin</p>
                <p className="mt-2 font-bold text-slate-800 dark:text-slate-200">{item.reason || item.replacementRequest?.reason || 'Không có mô tả thêm'}</p>
                {item.mandatory && (
                  <p className="mt-2 flex items-center gap-1.5 text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-900/30 px-3 py-1.5 rounded-lg w-fit">
                    <ShieldAlert className="h-3.5 w-3.5" /> Bắt buộc thay (Ưu tiên {item.priority})
                  </p>
                )}
              </div>
            </div>
          </section>
          <div className="grid gap-6 sm:grid-cols-2">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 h-fit">
              <h2 className="flex items-center gap-2 text-lg font-extrabold text-slate-900 dark:text-white">
                <User className="h-5 w-5 text-emerald-600" /> Thông tin Khách hàng
              </h2>
              <div className="mt-5 rounded-xl bg-slate-50 p-5 dark:bg-slate-800/50">
                <p className="font-extrabold text-lg text-slate-900 dark:text-white">{item.user?.fullName ?? 'Khách hàng'}</p>
                <div className="mt-3 space-y-2">
                  <div className="flex justify-between items-center border-b border-slate-200/60 pb-2 dark:border-slate-700/60">
                    <span className="text-sm font-medium text-slate-500">Số điện thoại</span>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{item.user?.phone || 'Chưa cập nhật'}</span>
                  </div>
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-sm font-medium text-slate-500">Email</span>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200 break-all ml-4 text-right">{item.user?.email || 'Chưa cập nhật'}</span>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 h-fit">
              <h2 className="flex items-center gap-2 text-lg font-extrabold text-slate-900 dark:text-white">
                <Car className="h-5 w-5 text-blue-600" /> Phương tiện & Pin hiện tại
              </h2>
              
              <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50/50 p-1 dark:border-slate-800 dark:bg-slate-800/20">
                <div className="bg-white dark:bg-slate-900 rounded-lg p-5">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3 dark:border-slate-800">
                      <span className="text-sm font-medium text-slate-500">Mẫu xe</span>
                      <span className="text-sm font-bold text-slate-900 dark:text-white text-right">{item.vehicle?.vehicleModel?.manufacturer} {item.vehicle?.vehicleModel?.name || item.vehicle?.name || '---'}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3 dark:border-slate-800">
                      <span className="text-sm font-medium text-slate-500">Loại pin</span>
                      <span className="text-sm font-bold text-slate-900 dark:text-white font-mono text-right">{item.vehicle?.batteryType || 'Chưa cập nhật'}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3 dark:border-slate-800">
                      <span className="text-sm font-medium text-slate-500">Biển số</span>
                      <span className="text-sm font-extrabold text-slate-900 dark:text-white">{item.vehicle?.plateNumber || '---'}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3 dark:border-slate-800">
                      <span className="text-sm font-medium text-slate-500">Số khung (VIN)</span>
                      <span className="text-sm font-bold text-slate-900 dark:text-white">{item.vehicle?.vin || 'Chưa cập nhật'}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3 dark:border-slate-800">
                      <span className="text-sm font-medium text-slate-500">Màu sắc</span>
                      <span className="text-sm font-bold text-slate-900 dark:text-white">{item.vehicle?.color || 'Chưa cập nhật'}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3 dark:border-slate-800">
                      <span className="text-sm font-medium text-slate-500">Số Km (ODO)</span>
                      <span className="text-sm font-bold text-slate-900 dark:text-white">{item.vehicle?.currentMileageKm ? `${item.vehicle.currentMileageKm.toLocaleString()} km` : 'Chưa cập nhật'}</span>
                    </div>
                  </div>

                  {currentBattery && (
                    <div className="mt-6 pt-5 border-t-2 border-dashed border-slate-200 dark:border-slate-700">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-extrabold uppercase tracking-widest text-slate-500">TRẠNG THÁI PIN HIỆN TẠI</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          currentBattery.soh < 70 || currentBattery.safetyState === 'UNSAFE' || currentBattery.safetyState === 'REPLACEMENT_REQUIRED'
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30'
                        }`}>
                          {currentBattery.soh < 70 || currentBattery.safetyState === 'UNSAFE' || currentBattery.safetyState === 'REPLACEMENT_REQUIRED' ? 'YÊU CẦU THAY' : 'AN TOÀN'}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center mb-5">
                        <span className="text-sm font-medium text-slate-500">Mã Pin:</span>
                        <span className="text-sm font-extrabold font-mono text-slate-900 dark:text-white">{extractBatteryCode(currentBattery.serialNumber)}</span>
                      </div>

                      <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
                        <div className="flex-1 text-center">
                          <span className="text-xs font-bold text-slate-500 mr-2">SOH</span>
                          <span className={`text-lg font-black ${
                            currentBattery.soh < 70 || currentBattery.safetyState === 'UNSAFE' || currentBattery.safetyState === 'REPLACEMENT_REQUIRED'
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-emerald-600 dark:text-emerald-400'
                          }`}>{currentBattery.soh}%</span>
                        </div>
                        <div className="w-px h-8 bg-slate-200 dark:bg-slate-700"></div>
                        <div className="flex-1 text-center">
                          <span className="text-xs font-bold text-slate-500 mr-2">SOC</span>
                          <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">{currentBattery.soc}%</span>
                        </div>
                      </div>
                      
                      <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
                        <div className="flex-1 text-center">
                          <span className="text-xs font-bold text-slate-500 mr-2">NHIỆT ĐỘ</span>
                          <span className="text-sm font-black text-slate-700 dark:text-slate-300">{currentBattery.temperature}°C</span>
                        </div>
                        <div className="w-px h-6 bg-slate-200 dark:bg-slate-700"></div>
                        <div className="flex-1 text-center">
                          <span className="text-xs font-bold text-slate-500 mr-2">ĐIỆN ÁP</span>
                          <span className="text-sm font-black text-slate-700 dark:text-slate-300">{currentBattery.voltage}V</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
        </div>

        <div className="space-y-6">
          {item.status === 'PENDING_APPROVAL' && (
            <section className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-6 shadow-sm dark:border-emerald-900/30 dark:bg-emerald-950/10">
              <h2 className="font-extrabold text-emerald-800 dark:text-emerald-400">Xử lý yêu cầu</h2>
              <p className="mt-2 mb-6 text-sm font-medium text-emerald-700/80 dark:text-emerald-500">Vui lòng kiểm tra kỹ thông tin trước khi ra quyết định.</p>
              
              <div className="space-y-6">
                <div className="rounded-xl border border-emerald-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Xác nhận duyệt</h3>
                  <p className="mt-1 mb-4 text-xs font-medium text-slate-500">Chấp thuận lịch hẹn và giữ khung giờ cho khách hàng.</p>
                  <Button className="w-full justify-center" loading={busy} onClick={() => void act(() => managerBookingService.approve(item.id), 'Đã duyệt lịch thay pin thành công.')}>Xác nhận và duyệt ngay</Button>
                </div>

                <div className="rounded-xl border border-rose-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2"><XCircle className="h-4 w-4 text-rose-600" /> Từ chối lịch thay pin</h3>
                  <label className="mt-3 block text-xs font-bold uppercase tracking-wider text-slate-500">Lý do từ chối *</label>
                  <textarea rows={3} placeholder="Nhập lý do chi tiết..." className={inputClass} value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} />
                  <Button className="mt-4 w-full justify-center" variant="danger" disabled={rejectReason.trim().length < 3} loading={busy} onClick={() => void act(() => managerBookingService.reject(item.id, rejectReason), 'Đã từ chối lịch thay pin.')}>Từ chối yêu cầu</Button>
                </div>


              </div>
            </section>
          )}

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="flex items-center gap-2 text-lg font-extrabold text-slate-900 dark:text-white">
              <FileText className="h-5 w-5 text-emerald-600" /> Lịch sử thao tác
            </h2>
            <div className="mt-4 flex flex-col gap-4 relative">
              {item.approvalHistory?.length ? item.approvalHistory.map((entry, idx) => (
                <div key={entry.id} className="relative pl-6">
                  <div className="absolute left-0 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50 ring-4 ring-white dark:ring-slate-900"><Check className="h-2.5 w-2.5 text-emerald-600 dark:text-emerald-400" /></div>
                  {idx !== item.approvalHistory!.length - 1 && <div className="absolute left-[7px] top-5 bottom-[-16px] w-px bg-slate-200 dark:bg-slate-800" />}
                  <p className="text-sm font-extrabold text-slate-900 dark:text-white">{statusLabel(entry.action)} <span className="font-medium text-slate-500 dark:text-slate-400">bởi</span> {entry.manager.fullName}</p>
                  <p className="mt-1 text-xs font-bold text-emerald-600">{new Date(entry.createdAt).toLocaleString('vi-VN')}</p>
                  {entry.reason && <p className="mt-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3 text-sm font-medium text-slate-700 dark:text-slate-300">"{entry.reason}"</p>}
                </div>
              )) : <p className="text-sm font-semibold text-slate-500 italic text-center py-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl">Chưa có thao tác nào được ghi nhận.</p>}
            </div>
          </section>
          
          {item.transactions && item.transactions.length > 0 && (
            <section className="rounded-2xl border border-blue-200 bg-white p-6 shadow-sm dark:border-blue-900/50 dark:bg-slate-900">
              <h2 className="flex items-center gap-2 text-lg font-extrabold text-blue-900 dark:text-blue-400">
                <User className="h-5 w-5 text-blue-600" /> Quá trình thực hiện của Staff
              </h2>
              {item.transactions.map(tx => (
                <div key={tx.id} className="mt-4">
                  <div className="rounded-xl bg-blue-50/50 p-4 dark:bg-slate-800/50 mb-4 border border-blue-100 dark:border-slate-700">
                    <p className="text-sm font-semibold text-slate-500">Nhân viên phụ trách</p>
                    <p className="text-lg font-black text-blue-900 dark:text-blue-300">{tx.staff?.fullName || 'Hệ thống'}</p>
                    <p className="text-xs font-bold text-slate-500 mt-1">Trạng thái cuối: <span className="text-blue-600">{statusLabel(tx.workflowStatus)}</span></p>
                  </div>
                  <div className="flex flex-col gap-4 relative">
                    {(() => {
                      const steps = (tx.stepHistory ?? []).filter(
                        (step, sIdx, arr) => sIdx === 0 || step.toStatus !== arr[sIdx - 1].toStatus
                      );
                      return steps.length ? steps.map((step, idx) => (
                        <div key={step.id} className="relative pl-6">
                          <div className="absolute left-0 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/50 ring-4 ring-white dark:ring-slate-900"><Check className="h-2.5 w-2.5 text-blue-600 dark:text-blue-400" /></div>
                          {idx !== steps.length - 1 && <div className="absolute left-[7px] top-5 bottom-[-16px] w-px bg-slate-200 dark:bg-slate-800" />}
                          <p className="text-sm font-extrabold text-slate-900 dark:text-white">
                            Cập nhật: <span className="text-blue-700">{statusLabel(step.toStatus)}</span>
                          </p>
                          <p className="mt-1 text-xs font-bold text-blue-600">{new Date(step.createdAt).toLocaleString('vi-VN')}</p>
                          {step.data?.action && (
                            <p className="mt-1 text-xs font-medium text-slate-500">Hành động: {statusLabel(step.data.action)}</p>
                          )}
                        </div>
                      )) : <p className="text-sm font-semibold text-slate-500 italic text-center py-4">Chưa có lịch sử thay pin.</p>;
                    })()}
                  </div>
                </div>
              ))}
            </section>
          )}

        </div>
      </div>
    </div>
  );
};
