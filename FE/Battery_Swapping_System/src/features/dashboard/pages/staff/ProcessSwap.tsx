import { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import { swapService, type ScannedBatteryInfo, type StaffSwap } from '../../../../services/swapService';
import { getApiErrorMessage } from '../../../../services/apiClient';
import { LoadingSpinner } from '../../../../components/feedback/LoadingSpinner';
import { statusLabel } from '../../../../utils/viLabels';
import { ArrowLeft, CheckCircle2, AlertCircle, RefreshCw, ArrowRight, UserCheck, CreditCard, Car, Upload, Loader2, Banknote } from 'lucide-react';
import jsQR from 'jsqr';
import { ReplacementBatteryAllocationStep } from './components/ReplacementBatteryAllocationStep';

// Workflow steps in order - mapping to UI stepper
const steps = [
  'NOT_STARTED',
  'VERIFIED',
  'OLD_BATTERY_REMOVED',
  'REPLACEMENT_ASSIGNED',
  'INSTALLED',
  'PAYMENT_PENDING',
  'COMPLETED',
];

const workflowStepLabels: Record<string, string> = {
  NOT_STARTED: 'Xác minh khách hàng & xe',
  VERIFIED: 'Quét QR & Tháo pin cũ',
  OLD_BATTERY_REMOVED: 'Phân bổ pin thay thế',
  REPLACEMENT_ASSIGNED: 'Lắp pin thay thế',
  INSTALLED: 'Thu phí dịch vụ',
  PAYMENT_PENDING: 'Chờ thanh toán',
  COMPLETED: 'Hoàn tất',
};

// Map internal status → stepper index (some intermediate statuses map to a step)
const statusToStepIndex = (workflowStatus: string): number => {
  switch (workflowStatus) {
    case 'NOT_STARTED':           return 0;
    case 'VERIFIED':              return 1;
    case 'OLD_BATTERY_INSPECTED': return 2; // same visual step as OLD_BATTERY_REMOVED
    case 'OLD_BATTERY_REMOVED':   return 2;
    case 'REPLACEMENT_ASSIGNED':  return 3;
    case 'INSTALLED':             return 4;
    case 'PAYMENT_PENDING':       return 5;
    case 'COMPLETED':             return 6;
    default:                      return 0;
  }
};

const isValidSocInput = (value: string) =>
  value === '' || (/^\d{1,3}$/.test(value) && Number(value) <= 100);

const extractBatteryCode = (code: string | undefined | null) => {
  if (!code) return '';
  const cleaned = code.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
  if (cleaned.includes('batteryCode=')) {
    const match = cleaned.match(/[?&]batteryCode=([^&#]*)/i);
    if (match?.[1]) {
      try {
        return decodeURIComponent(match[1]).trim();
      } catch {
        return match[1].trim();
      }
    }
  }
  const pathValue = cleaned.split(/[?#]/)[0].split('/').filter(Boolean).pop() || cleaned;
  try {
    return decodeURIComponent(pathValue).trim();
  } catch {
    return pathValue.trim();
  }
};

export const ProcessSwap = () => {
  const { swapId = '' } = useParams();

  // ── ALL useState HOOKS MUST BE DECLARED FIRST ──────────────────────────────
  const [swap, setSwap] = useState<StaffSwap | null>(null);
  const [serial, setSerial] = useState('');
  const [soc, setSoc] = useState('');
  const [soh, setSoh] = useState('');
  const [scanInfo, setScanInfo] = useState<ScannedBatteryInfo | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [isCashConfirmOpen, setIsCashConfirmOpen] = useState(false);
  // ───────────────────────────────────────────────────────────────────────────

  // ── CALLBACKS & EFFECTS ────────────────────────────────────────────────────
  const load = useCallback(
    () => swapService.get(swapId).then(setSwap).catch((cause) => setError(getApiErrorMessage(cause))),
    [swapId],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!swap || swap.workflowStatus !== 'VERIFIED' || !serial) return;
    const installed = swap.vehicle?.batteryAssignments?.[0]?.battery;
    const verifiedSerial = [...(swap.stepHistory ?? [])]
      .reverse()
      .find((step) => step.toStatus === 'VERIFIED')
      ?.data?.vehicleBatterySerial;
    const expectedCode = extractBatteryCode(
      installed?.qrCodeValue ||
      installed?.batteryCode ||
      installed?.serialNumber ||
      verifiedSerial,
    );
    if (!expectedCode || expectedCode.toUpperCase() !== extractBatteryCode(serial).toUpperCase()) return;

    let active = true;
    setScanLoading(true);
    setScanError('');
    void swapService
      .scanBattery(
        swap.id,
        installed?.qrCodeValue || installed?.batteryCode || installed?.serialNumber || verifiedSerial || serial,
      )
      .then((info) => {
        if (active) setScanInfo(info);
      })
      .catch((cause) => {
        if (active) setScanError(getApiErrorMessage(cause));
      })
      .finally(() => {
        if (active) setScanLoading(false);
      });
    return () => {
      active = false;
    };
  }, [serial, swap]);
  // ───────────────────────────────────────────────────────────────────────────

  // ── REGULAR FUNCTIONS (not hooks) ──────────────────────────────────────────
  const handleQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    setScanError('');

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code) {
            setSerial(extractBatteryCode(code.data));
            setScanInfo(null);
          } else {
            setScanError('Không tìm thấy mã QR hợp lệ trong ảnh.');
            setSerial('');
          }
        }
        setIsScanning(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

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
  // ───────────────────────────────────────────────────────────────────────────

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

  // ── Derived values (after early-return guards) ─────────────────────────────
  const status = swap.workflowStatus;
  const currentStepIdx = statusToStepIndex(status);
  const oldSerial = swap.batteryIn?.serialNumber;
  const completedOldBatteryCode = extractBatteryCode(oldSerial || serial);
  const rawVehicleBt = (swap.booking?.vehicle || swap.vehicle)?.batteryType;
  const vehicleBatteryType = rawVehicleBt
    ? rawVehicleBt
        .replace(/^Pin\s+/i, '')
        .replace(/\s*-\s*\d+(\.\d+)?\s*kWh.*$/i, '')
        .replace(/\s+\d+(\.\d+)?\s*kWh.*$/i, '')
        .replace(/\s*\(\d+V\).*$/i, '')
        .trim() || rawVehicleBt
    : 'Chưa xác định';
  const vehicleObj = swap.booking?.vehicle || swap.vehicle;
  const installedBattery = vehicleObj?.batteryAssignments?.[0]?.battery;
  const bookingBattery = swap.booking?.battery;
  const predictedOldBatterySoh = scanInfo?.estimate.estimatedSoh ?? installedBattery?.estimatedSoH ?? installedBattery?.soh;
  const rawHealthClass = scanInfo?.estimate.healthClassification ?? installedBattery?.healthClassification;
  const predictedHealthClassification = rawHealthClass || (predictedOldBatterySoh !== undefined && predictedOldBatterySoh !== null
    ? (predictedOldBatterySoh >= 80 ? 'HEALTHY' : predictedOldBatterySoh >= 70 ? 'LIMITED' : 'REPLACEMENT_REQUIRED')
    : undefined);
  const verifiedBatterySerial = [...(swap.stepHistory ?? [])]
    .reverse()
    .find((step) => step.toStatus === 'VERIFIED')
    ?.data?.vehicleBatterySerial;
  const expectedOldBatteryQr = extractBatteryCode(
    installedBattery?.qrCodeValue ||
    installedBattery?.batteryCode ||
    installedBattery?.serialNumber ||
    bookingBattery?.serialNumber ||
    verifiedBatterySerial,
  );
  const scannedOldBatteryQr = extractBatteryCode(serial);
  const oldBatteryQrMatches = Boolean(
    expectedOldBatteryQr &&
    scannedOldBatteryQr &&
    expectedOldBatteryQr.toUpperCase() === scannedOldBatteryQr.toUpperCase(),
  );

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
      </div>

      {error && (
        <div role="alert" className="flex items-center gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-rose-600 dark:text-rose-400">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* ── Stepper Progress Bar ─────────────────────────────────────────── */}
      <ol className="grid gap-2 grid-cols-2 sm:grid-cols-4 lg:grid-cols-7">
        {steps.map((step, index) => {
          const isCompleted = status === 'COMPLETED' ? index <= currentStepIdx : index < currentStepIdx;
          const isCurrent = status === 'COMPLETED' ? false : index === currentStepIdx;
          return (
            <li
              key={step}
              aria-current={isCurrent ? 'step' : undefined}
              className={`flex items-center gap-2 rounded-xl border p-3 text-xs font-extrabold transition-colors ${
                isCurrent
                  ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-500/20 dark:bg-blue-950/40 dark:text-blue-300'
                  : isCompleted
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                    : 'border-slate-200 bg-slate-50/50 text-slate-400 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-500'
              }`}
            >
              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] ${
                isCurrent
                  ? 'bg-blue-600 text-white'
                  : isCompleted
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
              }`}>
                {isCompleted ? <CheckCircle2 className="h-3 w-3" /> : index + 1}
              </span>
              <span>{workflowStepLabels[step]}</span>
            </li>
          );
        })}
      </ol>

      {/* ── Thông tin xác minh ────────────────────────────────────────────── */}
      <section className="app-panel p-6">
        <h2 className="flex items-center gap-2 text-lg font-black text-slate-900 dark:text-white">
          <UserCheck className="h-5 w-5 text-emerald-500" />
          <span>Thông tin xác minh</span>
        </h2>

        <div className="mt-5 grid gap-6 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-5 dark:border-slate-800 dark:bg-slate-900/60 space-y-2">
            <h3 className="font-extrabold text-slate-900 dark:text-white border-b border-slate-200/80 pb-2 dark:border-slate-800">
              Khách hàng
            </h3>
            <div className="space-y-1.5 text-sm text-slate-700 dark:text-slate-300">
              <p><span className="font-semibold text-slate-500 dark:text-slate-400">Họ tên:</span> <strong className="text-slate-900 dark:text-white">{swap.booking?.user?.fullName || 'Khách hàng'}</strong></p>
              <p><span className="font-semibold text-slate-500 dark:text-slate-400">SĐT:</span> <strong className="text-slate-900 dark:text-white">{swap.booking?.user?.phone || 'Chưa cập nhật'}</strong></p>
              <p><span className="font-semibold text-slate-500 dark:text-slate-400">Email:</span> <strong className="text-slate-900 dark:text-white">{swap.booking?.user?.email || 'Chưa cập nhật'}</strong></p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-5 dark:border-slate-800 dark:bg-slate-900/60 space-y-2">
            <h3 className="font-extrabold text-slate-900 dark:text-white border-b border-slate-200/80 pb-2 dark:border-slate-800 flex items-center justify-between">
              <span>Phương tiện</span>
              <Car className="h-4 w-4 text-emerald-500" />
            </h3>
            {swap.booking?.vehicle || swap.vehicle ? (
              <div className="space-y-1.5 text-sm text-slate-700 dark:text-slate-300">
                <p><span className="font-semibold text-slate-500 dark:text-slate-400">Tên xe:</span> <strong className="text-slate-900 dark:text-white">{(swap.booking?.vehicle || swap.vehicle)?.name}</strong></p>
                <p><span className="font-semibold text-slate-500 dark:text-slate-400">Biển số:</span> <strong className="font-mono text-emerald-600 dark:text-emerald-400">{(swap.booking?.vehicle || swap.vehicle)?.plateNumber}</strong></p>
                <p><span className="font-semibold text-slate-500 dark:text-slate-400">Loại pin:</span> {(swap.booking?.vehicle || swap.vehicle)?.batteryType || 'Không rõ'}</p>
                {(swap.booking?.vehicle || swap.vehicle)?.vinNumber && <p><span className="font-semibold text-slate-500 dark:text-slate-400">Số khung (VIN):</span> {(swap.booking?.vehicle || swap.vehicle)?.vinNumber}</p>}
                {(swap.booking?.vehicle || swap.vehicle)?.brand && <p><span className="font-semibold text-slate-500 dark:text-slate-400">Hãng / Dòng:</span> {(swap.booking?.vehicle || swap.vehicle)?.brand} {(swap.booking?.vehicle || swap.vehicle)?.model}</p>}
                {(swap.booking?.vehicle || swap.vehicle)?.manufactureYear && <p><span className="font-semibold text-slate-500 dark:text-slate-400">Năm SX:</span> {(swap.booking?.vehicle || swap.vehicle)?.manufactureYear}</p>}
                {(swap.booking?.vehicle || swap.vehicle)?.color && <p><span className="font-semibold text-slate-500 dark:text-slate-400">Màu sắc:</span> {(swap.booking?.vehicle || swap.vehicle)?.color}</p>}
              </div>
            ) : (
              <span className="text-sm text-slate-500 dark:text-slate-400">Chưa có thông tin xe</span>
            )}
          </div>
        </div>

        {swap.booking?.reason && (
          <div className="mt-4 rounded-xl border border-blue-500/20 bg-blue-500/10 p-4 text-sm text-blue-800 dark:text-blue-300">
            <span className="font-bold">Ghi chú / Yêu cầu từ khách hàng:</span> {swap.booking.reason}
          </div>
        )}

        <div className="mt-4 rounded-xl bg-slate-100 p-3 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300 flex items-center gap-2">
          <ArrowRight className="h-4 w-4 text-emerald-500" />
          <span>Hành động tiếp theo: <strong className="text-emerald-600 dark:text-emerald-400">{swap.nextActions?.join(', ') || 'Không có'}</strong></span>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* BƯỚC 1: Xác minh khách hàng (status = NOT_STARTED)                */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {status === 'NOT_STARTED' && (
        <section className="app-panel p-6 space-y-4">
          <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-blue-500" />
            <span>Bước 1: Xác minh khách hàng, xe và pin</span>
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Kiểm tra thông tin khách hàng và phương tiện đã đúng khớp với thông tin đặt lịch. Nhấn xác minh để bắt đầu quy trình.
          </p>
          <Button className="w-full sm:w-auto inline-flex items-center justify-center gap-2" loading={loading} onClick={() => void run(() => swapService.verify(swap.id))}>
            <CheckCircle2 className="h-4 w-4" />
            <span>Xác minh khách hàng, xe và pin</span>
          </Button>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* BƯỚC 1 - HOÀN TẤT (đã qua NOT_STARTED)                           */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {currentStepIdx > 0 && (
        <section className="app-panel border-emerald-200 p-5 dark:border-emerald-800">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">Bước 1: Xác minh khách hàng, xe và pin</h2>
              <p className="mt-0.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400">Đã xác minh thành công.</p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-extrabold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4" />
              Hoàn tất
            </span>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* BƯỚC 2: Quét QR & Tháo pin cũ (status = VERIFIED)                */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {status === 'VERIFIED' && (
        <section className="app-panel p-6 space-y-4">
          <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-blue-500" />
            <span>Bước 2: Quét QR Pin cũ trên xe &amp; Tháo pin</span>
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Tải ảnh chứa Mã QR Pin cũ
              </label>
              <div className="relative">
                <input type="file" accept="image/*" onChange={handleQrUpload} className="hidden" id="qr-file-input" />
                <label htmlFor="qr-file-input" className="flex items-center justify-center gap-2 w-full rounded-xl border border-dashed border-emerald-500/40 bg-emerald-50/50 p-4 text-xs font-bold text-emerald-700 hover:bg-emerald-100/50 dark:border-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400 cursor-pointer transition">
                  {isScanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  <span>{isScanning ? 'Đang giải mã QR...' : 'Chọn hoặc Tải ảnh QR pin cũ'}</span>
                </label>
              </div>

              {serial && (
                <div className="mt-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Mã nhận diện từ ảnh: <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{serial}</span>
                </div>
              )}

              {/* Thông báo lỗi khi QR không khớp */}
              {serial && !isScanning && !oldBatteryQrMatches && expectedOldBatteryQr && (
                <div className="mt-2 flex items-start gap-2 rounded-xl border border-rose-300 bg-rose-50 p-3 dark:border-rose-800 dark:bg-rose-950/40">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-extrabold text-rose-700 dark:text-rose-400">Mã QR không khớp với pin trên xe!</p>
                    <p className="mt-1 text-rose-600 dark:text-rose-400">
                      Kỳ vọng: <span className="font-mono font-bold">{expectedOldBatteryQr}</span>
                    </p>
                    <p className="text-rose-600 dark:text-rose-400">
                      Vừa quét: <span className="font-mono font-bold">{scannedOldBatteryQr}</span>
                    </p>
                    <p className="mt-1 text-rose-500 dark:text-rose-500">Vui lòng tải lại ảnh QR đúng của pin đang gắn trên xe.</p>
                  </div>
                </div>
              )}

              {/* Thông báo lỗi khi QR không có pin kỳ vọng */}
              {serial && !isScanning && !oldBatteryQrMatches && !expectedOldBatteryQr && (
                <div className="mt-2 flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/40">
                  <AlertCircle className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-extrabold text-amber-700 dark:text-amber-400">Không tìm thấy thông tin pin trên xe.</p>
                    <p className="mt-1 text-amber-600 dark:text-amber-400">Hệ thống chưa có dữ liệu pin gắn trên xe này để so sánh.</p>
                  </div>
                </div>
              )}

              {scanError && <p className="text-red-500 text-sm mt-1">{scanError}</p>}

            </div>
            <Input
              label="Mức pin cũ tháo ra (SOC %)"
              type="number"
              min={0}
              max={100}
              step={1}
              placeholder="Nhập từ 0 đến 100"
              value={soc}
              onChange={(event) => { if (isValidSocInput(event.target.value)) setSoc(event.target.value); }}
            />
            <Input
              label="Sức khỏe pin hiện tại (SOH %)"
              type="number"
              min={0}
              max={100}
              step={0.01}
              placeholder={predictedOldBatterySoh !== undefined && predictedOldBatterySoh !== null ? `Dự đoán: ${predictedOldBatterySoh.toFixed(2)}%` : 'Nhập từ 0 đến 100'}
              value={soh}
              onChange={(event) => { if (isValidSocInput(event.target.value)) setSoh(event.target.value); }}
            />
          </div>

          {oldBatteryQrMatches && predictedOldBatterySoh !== undefined && predictedOldBatterySoh !== null && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/30">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Sức khỏe dự đoán</p>
              <p className="mt-1 text-2xl font-black text-emerald-700 dark:text-emerald-300">{predictedOldBatterySoh.toFixed(2)}%</p>
              {predictedHealthClassification && <p className="mt-1 text-sm font-semibold text-emerald-800 dark:text-emerald-300">Phân loại: {statusLabel(predictedHealthClassification)}</p>}
            </div>
          )}
          {oldBatteryQrMatches && scanLoading && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
              <Loader2 className="h-4 w-4 animate-spin" />
              Đang tải Sức khỏe dự đoán...
            </div>
          )}
          <Button disabled={!oldBatteryQrMatches || soc === ''} loading={loading} onClick={() => void run(() => swapService.remove(swap.id, serial, Number(soc), soh !== '' ? Number(soh) : undefined))}>
            Hoàn tất kiểm tra và tháo pin cũ
          </Button>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* BƯỚC 2 - HOÀN TẤT (đã qua VERIFIED)                              */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {currentStepIdx > 1 && (
        <section className="app-panel border-emerald-200 p-6 dark:border-emerald-800">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">Bước 2: Kiểm tra loại pin và tháo pin cũ</h2>
              <p className="mt-1 text-sm font-semibold text-emerald-600 dark:text-emerald-400">Đã hoàn tất kiểm tra và tháo pin cũ.</p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-extrabold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4" />
              Hoàn tất
            </span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900/60">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Mã QR Pin</p>
              <p className="mt-1 font-mono font-extrabold text-slate-900 dark:text-white">{completedOldBatteryCode || '—'}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900/60">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">SOC khi tháo</p>
              <p className="mt-1 text-xl font-black text-slate-900 dark:text-white">{swap.batteryIn?.soc === undefined ? '—' : `${swap.batteryIn.soc}%`}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900/60">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Sức khỏe pin</p>
              <p className="mt-1 text-xl font-black text-emerald-600 dark:text-emerald-400">{swap.batteryIn?.soh === undefined ? '—' : `${swap.batteryIn.soh.toFixed(2)}%`}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900/60">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Loại pin</p>
              <p className="mt-1 font-extrabold text-slate-900 dark:text-white">{vehicleBatteryType}</p>
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* BƯỚC 3 & 4: Phân bổ & Lắp pin thay thế                          */}
      {/* Hiển thị khi đang ở bước 3-4 (OLD_BATTERY_REMOVED → INSTALLED)  */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {['OLD_BATTERY_REMOVED', 'OLD_BATTERY_INSPECTED', 'REPLACEMENT_ASSIGNED'].includes(status) && (
        <ReplacementBatteryAllocationStep
          swapId={swap.id}
          onCompleted={() => void load()}
          onInstall={async (batteryCode) => {
            if (swap.workflowStatus !== 'INSTALLED') {
              await swapService.install(swap.id, batteryCode);
            }
            await load();
          }}
        />
      )}

      {/* BƯỚC 3 & 4 - HOÀN TẤT (đã qua REPLACEMENT_ASSIGNED / INSTALLED+) */}
      {currentStepIdx > 3 && (
        <section className="app-panel border-emerald-200 p-5 dark:border-emerald-800">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">Bước 3 &amp; 4: Phân bổ và lắp pin thay thế</h2>
              <p className="mt-0.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400">Pin thay thế đã được phân bổ và lắp vào xe thành công.</p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-extrabold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4" />
              Hoàn tất
            </span>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* BƯỚC 5: Thu phí & Tạo yêu cầu thanh toán (status = INSTALLED)   */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {status === 'INSTALLED' && (
        <section className="app-panel p-6 space-y-5">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-emerald-500" />
              <span>Bước 5: Thu phí &amp; Tạo yêu cầu thanh toán</span>
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Pin mới đã được gắn vào xe thành công. Chọn phương thức thanh toán tiền dịch vụ để hoàn tất giao dịch.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Phương thức 1: Tiền mặt */}
            <div className="flex flex-col justify-between rounded-2xl border border-emerald-500/30 bg-emerald-50/50 p-5 dark:border-emerald-800/60 dark:bg-emerald-950/20">
              <div>
                <div className="flex items-center gap-2.5 text-emerald-700 dark:text-emerald-400">
                  <Banknote className="h-6 w-6" />
                  <h3 className="font-extrabold text-base">Thanh toán Tiền mặt (Cash)</h3>
                </div>
                <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                  Thu tiền mặt trực tiếp từ khách hàng tại trạm. Hệ thống sẽ xác nhận hoàn tất giao dịch đổi pin lập tức.
                </p>
              </div>
              <div className="mt-4">
                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700 font-bold text-white shadow-xs"
                  loading={loading}
                  onClick={() => setIsCashConfirmOpen(true)}
                >
                  <Banknote className="mr-1.5 h-4 w-4" />
                  Xác nhận đã thu Tiền mặt
                </Button>
              </div>
            </div>

            {/* Phương thức 2: VNPay */}
            <div className="flex flex-col justify-between rounded-2xl border border-blue-500/30 bg-blue-50/50 p-5 dark:border-blue-800/60 dark:bg-blue-950/20">
              <div>
                <div className="flex items-center gap-2.5 text-blue-700 dark:text-blue-400">
                  <CreditCard className="h-6 w-6" />
                  <h3 className="font-extrabold text-base">Thanh toán VNPay (Online)</h3>
                </div>
                <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                  Thực hiện thanh toán VNPay trực tiếp trên màn hình trạm hoặc mở trang thanh toán VNPay cho khách hàng.
                </p>
              </div>
              <div className="mt-4">
                <Button
                  variant="outline"
                  className="w-full border-blue-500 text-blue-600 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-950/50 font-bold"
                  loading={loading}
                  onClick={() =>
                    void run(async () => {
                      const updatedSwap = await swapService.requestDirectPayment(swap.id, 'VNPAY');
                      if (updatedSwap?.paymentUrl) {
                        window.location.href = updatedSwap.paymentUrl;
                      }
                    })
                  }
                >
                  <CreditCard className="mr-1.5 h-4 w-4" />
                  Chuyển sang Thanh toán VNPay
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* BƯỚC 5 - HOÀN TẤT (đã qua INSTALLED → PAYMENT_PENDING hoặc COMPLETED) */}
      {currentStepIdx > 4 && (
        <section className="app-panel border-emerald-200 p-5 dark:border-emerald-800">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">Bước 5: Thu phí &amp; Tạo yêu cầu thanh toán</h2>
              <p className="mt-0.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400">Đã tạo yêu cầu thanh toán thành công.</p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-extrabold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4" />
              Hoàn tất
            </span>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* BƯỚC 6: Thanh toán VNPay (status = PAYMENT_PENDING)               */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {status === 'PAYMENT_PENDING' && (
        <section className="app-panel p-6 space-y-4 border-blue-200 dark:border-blue-900/60">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-blue-500" />
              <span>Bước 6: Thanh toán VNPay</span>
            </h2>
          </div>

          <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-5 text-sm font-bold text-blue-800 dark:text-blue-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <CreditCard className="h-5 w-5 shrink-0 text-blue-600" />
              <div>
                <p className="font-extrabold text-slate-900 dark:text-white">Thanh toán dịch vụ qua cổng VNPay</p>
                <p className="text-xs font-normal text-blue-800 dark:text-blue-300 mt-0.5">
                  Nhấn nút bên dưới để chuyển trực tiếp đến cổng thanh toán VNPay thực hiện giao dịch.
                </p>
              </div>
            </div>
            {swap.paymentUrl && (
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold shrink-0"
                onClick={() => {
                  window.location.href = swap.paymentUrl!;
                }}
              >
                <CreditCard className="mr-1.5 h-4 w-4" />
                Thanh toán ngay qua VNPay
              </Button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-200/60 dark:border-slate-800">
            <span className="text-xs text-slate-500 dark:text-slate-400">Khách hàng muốn chuyển sang thu tiền mặt tại trạm:</span>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              loading={loading}
              onClick={() => setIsCashConfirmOpen(true)}
            >
              <Banknote className="mr-1.5 h-4 w-4" />
              Chuyển sang Thu tiền mặt &amp; Hoàn tất
            </Button>
          </div>
        </section>
      )}

      {/* BƯỚC 6 - HOÀN TẤT (đã thanh toán xong → COMPLETED) */}
      {currentStepIdx > 5 && (
        <section className="app-panel border-emerald-200 p-5 dark:border-emerald-800">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">Bước 6: Chờ khách hàng thanh toán</h2>
              <p className="mt-0.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400">Khách hàng đã thanh toán thành công.</p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-extrabold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4" />
              Hoàn tất
            </span>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* BƯỚC 7: Hoàn tất (status = COMPLETED)                            */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {status === 'COMPLETED' && (() => {
        const completedStep = [...(swap.stepHistory ?? [])].reverse().find((step) => step.toStatus === 'COMPLETED');
        const isCash = completedStep?.data?.paymentMethod === 'CASH' || !completedStep?.data?.paymentMethod;
        return (
          <section className="app-panel border-emerald-200 p-6 dark:border-emerald-800 space-y-4">
            {/* Header - giống style các bước hoàn tất khác */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white">Bước 7: Hoàn tất quy trình thay pin</h2>
                <p className="mt-0.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400">Quy trình thay pin và thu phí dịch vụ đã hoàn tất thành công.</p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-extrabold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4" />
                Hoàn tất
              </span>
            </div>

            {/* Chi tiết hoàn tất */}
            <div className="grid gap-3 sm:grid-cols-3 text-xs">
              <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900/60">
                <span className="text-slate-400 block text-[11px] font-bold uppercase tracking-wider">Phương thức thanh toán</span>
                <span className="font-bold text-slate-900 dark:text-white text-sm mt-1 flex items-center gap-1.5">
                  {isCash ? <Banknote className="h-4 w-4 text-emerald-600" /> : <CreditCard className="h-4 w-4 text-blue-600" />}
                  {isCash ? 'Tiền mặt (Cash tại trạm)' : 'Chuyển khoản VNPay'}
                </span>
              </div>
              <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900/60">
                <span className="text-slate-400 block text-[11px] font-bold uppercase tracking-wider">Trạng thái</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm mt-1 block">
                  ĐÃ HOÀN TẤT
                </span>
              </div>
              <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900/60">
                <span className="text-slate-400 block text-[11px] font-bold uppercase tracking-wider">Thời gian hoàn thành</span>
                <span className="font-bold text-slate-900 dark:text-white text-sm mt-1 block">
                  {completedStep?.createdAt
                    ? new Date(completedStep.createdAt).toLocaleString('vi-VN')
                    : new Date().toLocaleString('vi-VN')}
                </span>
              </div>
            </div>
          </section>
        );
      })()}

      {/* ── Cash Payment Confirmation Modal ─────────────────────────────── */}
      {isCashConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10">
                <Banknote className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-white text-lg">
                  Xác nhận thu tiền mặt
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Xác nhận nhân viên đã thu đủ tiền mặt từ khách hàng
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-4 space-y-2 text-sm dark:border-slate-800 dark:bg-slate-800/50">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">Khách hàng:</span>
                <span className="font-bold text-slate-900 dark:text-white">{swap.booking?.user?.fullName || 'Khách hàng'}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">Số xe / Biển số:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{swap.booking?.vehicle?.plateNumber || swap.vehicle?.plateNumber || 'Chưa xác định'}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-slate-200 pt-2 dark:border-slate-700">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Tổng tiền mặt thu:</span>
                <span className="font-black text-emerald-600 dark:text-emerald-400 text-base">
                  {(swap.booking?.costEstimate || 450000).toLocaleString('vi-VN')} VNĐ
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              ⚠️ Vui lòng đảm bảo bạn đã trực tiếp thu đủ số tiền mặt trên. Khi xác nhận, quy trình thay pin sẽ lập tức được đánh dấu hoàn tất.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                disabled={loading}
                onClick={() => setIsCashConfirmOpen(false)}
              >
                Hủy bỏ
              </Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                loading={loading}
                onClick={async () => {
                  setIsCashConfirmOpen(false);
                  await run(() => swapService.requestDirectPayment(swap.id, 'CASH'));
                }}
              >
                <Banknote className="mr-1.5 h-4 w-4" />
                Xác nhận đã thu tiền
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProcessSwap;
