import { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import { swapService, type InspectionInput, type ScannedBatteryInfo, type StaffSwap } from '../../../../services/swapService';
import { getApiErrorMessage } from '../../../../services/apiClient';
import { LoadingSpinner } from '../../../../components/feedback/LoadingSpinner';
import { statusLabel } from '../../../../utils/viLabels';
import { ArrowLeft, CheckCircle2, QrCode, AlertCircle, RefreshCw, ShieldAlert, ArrowRight, UserCheck, Wrench, CreditCard, Clock } from 'lucide-react';

const steps = ['NOT_STARTED', 'VERIFIED', 'OLD_BATTERY_REMOVED', 'OLD_BATTERY_INSPECTED', 'REPLACEMENT_ASSIGNED', 'INSTALLED', 'PAYMENT_PENDING', 'COMPLETED'];

const formatNumber = (value?: number | null) => (value === undefined || value === null ? '-' : value.toLocaleString('vi-VN'));

export const ProcessSwap = () => {
  const { swapId = '' } = useParams();
  const [swap, setSwap] = useState<StaffSwap | null>(null);
  const [serial, setSerial] = useState('');
  const [soc, setSoc] = useState('');
  const [scanInfo, setScanInfo] = useState<ScannedBatteryInfo | null>(null);
  const [inspection, setInspection] = useState({
    soh: '',
    temperature: '',
    voltage: '',
    physicalCondition: '',
    outcome: 'MAINTENANCE' as InspectionInput['outcome'],
    notes: '',
  });
  const [rollbackReason, setRollbackReason] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);

  const load = useCallback(() => swapService.get(swapId).then(setSwap).catch((cause) => setError(getApiErrorMessage(cause))), [swapId]);

  useEffect(() => {
    void load();
  }, [load]);

  const run = async (action: () => Promise<unknown>) => {
    setLoading(true);
    setError('');
    try {
      await action();
      setScanInfo(null);
      await load();
    } catch (cause) {
      setError(getApiErrorMessage(cause));
    } finally {
      setLoading(false);
    }
  };

  const scanBattery = async () => {
    if (!serial.trim() || !swap) return;
    setScanLoading(true);
    setError('');
    try {
      const info = await swapService.scanBattery(swap.id, serial.trim());
      setScanInfo(info);
      setSoc(String(info.battery.soc));
      setInspection((current) => ({
        ...current,
        soh: String(info.estimate.estimatedSoh),
        temperature: info.battery.temperature === undefined || info.battery.temperature === null ? current.temperature : String(info.battery.temperature),
        voltage: info.battery.voltage === undefined || info.battery.voltage === null ? current.voltage : String(info.battery.voltage),
      }));
    } catch (cause) {
      setError(getApiErrorMessage(cause));
    } finally {
      setScanLoading(false);
    }
  };

  if (!swap && !error) return <LoadingSpinner label="Đang tải quy trình thay pin..." />;
  if (!swap) {
    return (
      <div className="mx-auto max-w-4xl p-4">
        <div role="alert" className="flex items-center gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-rose-600 dark:text-rose-400">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      </div>
    );
  }

  const status = swap.workflowStatus;
  const oldSerial = swap.batteryIn?.serialNumber;
  const reservedSerial = swap.booking?.battery?.serialNumber ?? swap.batteryOut?.serialNumber;
  const canScan = ['VERIFIED', 'OLD_BATTERY_REMOVED', 'OLD_BATTERY_INSPECTED', 'REPLACEMENT_ASSIGNED'].includes(status);
  const currentStepIdx = steps.indexOf(status);

  const inputStyle = 'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none';

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5 dark:border-slate-800">
        <div>
          <Link to="/staff/history" className="mb-2 inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-emerald-500 transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" /> Quay lại lịch sử thay pin
          </Link>
          <div className="eyebrow flex items-center gap-2 mb-1">
            <RefreshCw className="h-4 w-4 text-emerald-500" />
            <span>Quy trình phục vụ tại trạm</span>
          </div>
          <h1 className="page-title">Quy trình thay pin</h1>
          <p className="page-description">
            Mã giao dịch <span className="font-mono font-bold text-slate-900 dark:text-white">{swap.id}</span>; Quét mã pin trước khi tháo, kiểm tra và lắp pin.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-emerald-500/10 px-4 py-1.5 text-xs font-extrabold text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
            {statusLabel(status)}
          </span>
        </div>
      </div>

      {error && (
        <div role="alert" className="flex items-center gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-rose-600 dark:text-rose-400">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Stepper Progress Bar */}
      <ol className="grid gap-2 grid-cols-2 md:grid-cols-4">
        {steps.map((step, index) => {
          const isDoneOrCurrent = index <= currentStepIdx;
          return (
            <li
              key={step}
              className={`flex items-center gap-2 rounded-xl border p-3 text-xs font-extrabold transition-colors ${
                isDoneOrCurrent
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
                  : 'border-slate-200 bg-slate-50/50 text-slate-400 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-500'
              }`}
            >
              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] ${isDoneOrCurrent ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                {index + 1}
              </span>
              <span className="truncate">{statusLabel(step)}</span>
            </li>
          );
        })}
      </ol>

      {/* Thông tin xác minh */}
      <section className="app-panel p-6">
        <h2 className="flex items-center gap-2 text-lg font-black text-slate-900 dark:text-white">
          <UserCheck className="h-5 w-5 text-emerald-500" />
          <span>Thông tin xác minh</span>
        </h2>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Khách hàng & Xe</p>
            <p className="font-extrabold text-slate-900 dark:text-white">
              {swap.booking?.user?.fullName || 'Khách hàng'}
            </p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {swap.booking?.vehicle?.name} · <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{swap.booking?.vehicle?.plateNumber}</span>
            </p>
          </div>

          <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Loại pin & Pin đặt trước</p>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              Loại pin: <strong className="font-mono">{swap.booking?.vehicle?.batteryType || swap.vehicle?.batteryType || 'Khôn g rõ'}</strong>
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
              Pin giữ chỗ: <strong className="font-mono text-emerald-600 dark:text-emerald-400">{reservedSerial ?? '-'}</strong>
            </p>
          </div>
        </div>

        {swap.booking?.reason && (
          <div className="mt-4 rounded-xl border border-blue-500/20 bg-blue-500/10 p-4 text-sm text-blue-800 dark:text-blue-300">
            <span className="font-bold">Ghi chú / Yêu cầu từ khách hàng:</span> {swap.booking.reason}
          </div>
        )}

        <div className="mt-4 rounded-xl bg-slate-100 p-3 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300 flex items-center gap-2">
          <ArrowRight className="h-4 w-4 text-emerald-500" />
          <span>Hành động tiếp theo: <strong className="text-emerald-600 dark:text-emerald-400">{swap.nextActions?.map(statusLabel).join(', ') || 'Không có'}</strong></span>
        </div>
      </section>

      {/* Quét Mã Pin (nếu ở các bước cho phép) */}
      {canScan && (
        <section className="app-panel p-6">
          <h2 className="flex items-center gap-2 text-lg font-black text-slate-900 dark:text-white mb-4">
            <QrCode className="h-5 w-5 text-emerald-500" />
            <span>Quét / Nhập mã pin</span>
          </h2>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <Input label="Quét mã QR hoặc nhập Serial Pin" value={serial} onChange={(event) => setSerial(event.target.value)} />
            <Button variant="secondary" disabled={!serial.trim()} loading={scanLoading} onClick={() => void scanBattery()}>
              Lấy thông tin pin
            </Button>
          </div>

          {scanInfo && (
            <div
              className={`mt-4 rounded-2xl border p-5 text-sm ${
                scanInfo.expectedForCurrentStep
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200'
                  : 'border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-base mb-2">
                {scanInfo.expectedForCurrentStep ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <AlertCircle className="h-5 w-5 text-amber-500" />}
                <span>{scanInfo.expectedForCurrentStep ? 'Đúng pin cho bước hiện tại' : 'Cần kiểm tra lại: Pin không khớp kỳ vọng của bước hiện tại'}</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 text-xs font-medium">
                <p>Mã Serial: <strong className="font-mono text-sm">{scanInfo.battery.serialNumber || scanInfo.battery.batteryCode}</strong></p>
                <p>SOC (Mức sạc): <strong>{scanInfo.battery.soc}%</strong> · SOH hiện tại: <strong>{scanInfo.battery.soh}%</strong></p>
                <p>Ước tính SOH: <strong>{scanInfo.estimate.estimatedSoh}%</strong> (từ {formatNumber(scanInfo.estimate.accumulatedMileageKm)} km & {scanInfo.estimate.ageYears} năm sử dụng)</p>
                <p>Trạng thái: <strong>{statusLabel(scanInfo.battery.operationalStatus)}</strong> · An toàn: <strong>{statusLabel(scanInfo.battery.safetyState)}</strong></p>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Action Sections according to workflow status */}
      {status === 'NOT_STARTED' && (
        <Button className="w-full sm:w-auto inline-flex items-center justify-center gap-2" loading={loading} onClick={() => void run(() => swapService.verify(swap.id))}>
          <CheckCircle2 className="h-4 w-4" />
          <span>Xác minh khách hàng, xe và pin</span>
        </Button>
      )}

      {status === 'VERIFIED' && (
        <section className="app-panel p-6 space-y-4">
          <h2 className="text-lg font-black text-slate-900 dark:text-white">Bước 2: Xác nhận tháo pin cũ</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Mã pin tháo ra (Serial / Code)" value={serial} onChange={(event) => setSerial(event.target.value)} placeholder="Nhập hoặc quét mã pin cũ (Ví dụ: VF8-INSTALLED-001)" />
            <Input label="Mức pin cũ tháo ra (SOC %)" type="number" placeholder="Ví dụ: 72" value={soc} onChange={(event) => setSoc(event.target.value)} />
          </div>
          <Button disabled={!serial || soc === ''} loading={loading} onClick={() => void run(() => swapService.remove(swap.id, serial, Number(soc)))}>
            Xác nhận tháo pin cũ
          </Button>
        </section>
      )}

      {status === 'OLD_BATTERY_REMOVED' && (
        <section className="app-panel p-6 space-y-4">
          <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Wrench className="h-5 w-5 text-emerald-500" />
            <span>Bước 3: Biên bản kiểm tra pin cũ</span>
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Mã pin đã tháo" value={serial || oldSerial || ''} onChange={(event) => setSerial(event.target.value)} />
            <Input label="Mức pin (SOC %)" type="number" value={soc} onChange={(event) => setSoc(event.target.value)} />
            <Input label="Sức khỏe pin (SOH %)" type="number" value={inspection.soh} onChange={(event) => setInspection({ ...inspection, soh: event.target.value })} />
            <Input label="Nhiệt độ (°C)" type="number" value={inspection.temperature} onChange={(event) => setInspection({ ...inspection, temperature: event.target.value })} />
            <Input label="Điện áp (V)" type="number" value={inspection.voltage} onChange={(event) => setInspection({ ...inspection, voltage: event.target.value })} />
            <Input label="Tình trạng vật lý" value={inspection.physicalCondition} onChange={(event) => setInspection({ ...inspection, physicalCondition: event.target.value })} />
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
              Kết luận kiểm tra
              <select
                aria-label="Kết luận kiểm tra"
                className={`${inputStyle} mt-1.5`}
                value={inspection.outcome}
                onChange={(event) => setInspection({ ...inspection, outcome: event.target.value as InspectionInput['outcome'] })}
              >
                {['AVAILABLE', 'MAINTENANCE', 'QUARANTINED', 'RETIRED'].map((value) => (
                  <option key={value} value={value}>
                    {statusLabel(value)}
                  </option>
                ))}
              </select>
            </label>
            <Input label="Ghi chú thêm" value={inspection.notes} onChange={(event) => setInspection({ ...inspection, notes: event.target.value })} />
          </div>
          <Button
            disabled={!serial || soc === '' || !inspection.soh || !inspection.physicalCondition}
            loading={loading}
            onClick={() =>
              void run(() =>
                swapService.inspect(swap.id, {
                  serialNumber: serial,
                  soc: Number(soc),
                  soh: Number(inspection.soh),
                  temperature: inspection.temperature ? Number(inspection.temperature) : undefined,
                  voltage: inspection.voltage ? Number(inspection.voltage) : undefined,
                  physicalCondition: inspection.physicalCondition,
                  outcome: inspection.outcome,
                  notes: inspection.notes || undefined,
                }),
              )
            }
          >
            Lưu biên bản kiểm tra
          </Button>
        </section>
      )}

      {status === 'OLD_BATTERY_INSPECTED' && (
        <section className="app-panel p-6 space-y-4">
          <h2 className="text-lg font-black text-slate-900 dark:text-white">Bước 4: Phân bổ pin thay thế</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Pin an toàn đã giữ cho xe: <strong className="font-mono text-emerald-600 dark:text-emerald-400">{reservedSerial}</strong>
          </p>
          <Button disabled={!serial} loading={loading} onClick={() => void run(() => swapService.assign(swap.id, serial))}>
            Gán đúng pin đã giữ
          </Button>
        </section>
      )}

      {status === 'REPLACEMENT_ASSIGNED' && (
        <section className="app-panel p-6 space-y-4">
          <h2 className="text-lg font-black text-slate-900 dark:text-white">Bước 5: Lắp pin mới lên xe</h2>
          <Button disabled={!serial} loading={loading} onClick={() => void run(() => swapService.install(swap.id, serial))}>
            Xác nhận lắp pin thành công
          </Button>
        </section>
      )}

      {status === 'INSTALLED' && (
        <section className="app-panel p-6 space-y-4">
          <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-emerald-500" />
            <span>Yêu cầu thanh toán trực tiếp</span>
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Pin mới đã được gắn vào xe thành công. Tạo hóa đơn và gửi yêu cầu thanh toán VNPay cho khách hàng.
          </p>
          <Button loading={loading} onClick={() => void run(() => swapService.requestDirectPayment(swap.id))}>
            Gửi yêu cầu thanh toán VNPay
          </Button>
        </section>
      )}

      {status === 'PAYMENT_PENDING' && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5 text-sm font-bold text-amber-700 dark:text-amber-300 flex items-center gap-3">
          <Clock className="h-5 w-5 shrink-0" />
          <span>Đang chờ khách hàng thanh toán trực tiếp qua VNPay. Hệ thống tự hoàn tất sau khi kết quả thanh toán được xác minh.</span>
        </div>
      )}

      {status === 'COMPLETED' && (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5 text-sm font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>Thay pin và thanh toán đã hoàn tất thành công!</span>
        </div>
      )}

      {/* Rollback Option */}
      {!['COMPLETED', 'ROLLED_BACK'].includes(status) && (
        <section className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-6 dark:bg-rose-950/20 space-y-3">
          <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold">
            <ShieldAlert className="h-4 w-4" />
            <span>Hoàn tác giao dịch</span>
          </div>
          <Input label="Lý do hoàn tác" value={rollbackReason} onChange={(event) => setRollbackReason(event.target.value)} />
          <Button variant="danger" disabled={rollbackReason.trim().length < 3} loading={loading} onClick={() => void run(() => swapService.rollback(swap.id, rollbackReason))}>
            Hoàn tác giao dịch
          </Button>
        </section>
      )}
    </div>
  );
};

export default ProcessSwap;
