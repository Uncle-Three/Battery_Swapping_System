import { useState, useEffect, useCallback, type FC } from 'react';
import { Button } from '../../../../../components/ui/Button';
import { ReplacementBatteryCard, type BatteryCandidate } from './ReplacementBatteryCard';
import { ReplacementBatterySelectorModal } from './ReplacementBatterySelectorModal';
import { BatteryQrVerificationModal } from './BatteryQrVerificationModal';
import {
  replacementAllocationService,
  type ReplacementAllocationStatus,
  type ReplacementAllocationStatusResponse,
} from '../../../../../services/replacementAllocationService';
import { getApiErrorMessage } from '../../../../../services/apiClient';
import {
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Battery,
  RefreshCw,
  AlertCircle,
  Building2,
} from 'lucide-react';

interface ReplacementBatteryAllocationStepProps {
  swapId: string;
  onCompleted?: () => void;
  /** Called after QR verified & install confirmed — should call swapService.install() */
  onInstall?: (reservedBatteryCode: string) => Promise<void>;
}

export const ReplacementBatteryAllocationStep: FC<ReplacementBatteryAllocationStepProps> = ({
  swapId,
  onCompleted,
  onInstall,
}) => {
  const [data, setData] = useState<ReplacementAllocationStatusResponse | null>(null);
  const [status, setStatus] = useState<ReplacementAllocationStatus>('SEARCHING');
  const [selectedBattery, setSelectedBattery] = useState<BatteryCandidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Modals
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [isInstallConfirmOpen, setIsInstallConfirmOpen] = useState(false);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await replacementAllocationService.getStatus(swapId);
      setData(res);
      setStatus(res.state);

      if (res.reservedBattery) {
        setSelectedBattery(res.reservedBattery);
      } else if (res.recommendedBattery) {
        setSelectedBattery(res.recommendedBattery);
      } else {
        setSelectedBattery(null);
      }
    } catch (err: any) {
      setError(getApiErrorMessage(err) || 'Không thể tải thông tin kho pin.');
    } finally {
      setLoading(false);
    }
  }, [swapId]);

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  // Actions
  const handleReserve = async (batteryIdToReserve?: string) => {
    const targetId = batteryIdToReserve || selectedBattery?.id;
    if (!targetId) return;

    setBusy(true);
    setError('');
    setSuccessMessage('');
    try {
      await replacementAllocationService.reserve(swapId, targetId);
      const code = selectedBattery?.code || selectedBattery?.serialNumber || 'pin';
      setSuccessMessage(`Đã giữ pin ${code} cho giao dịch này.`);
      await fetchStatus();
    } catch (err: any) {
      const errMsg = getApiErrorMessage(err);
      if (err?.response?.status === 409) {
        setError(errMsg || 'Pin này vừa được giữ bởi một giao dịch khác. Vui lòng chọn pin khác.');
        void fetchStatus(); // Auto refresh on concurrency conflict
      } else {
        setError(errMsg || 'Không thể giữ pin này.');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleCancelReservation = async () => {
    setBusy(true);
    setError('');
    setSuccessMessage('');
    try {
      await replacementAllocationService.cancelReservation(swapId);
      setIsCancelConfirmOpen(false);
      await fetchStatus();
    } catch (err: any) {
      setError(getApiErrorMessage(err) || 'Không thể hủy giữ pin.');
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyQr = async (scannedValue: string) => {
    setBusy(true);
    setError('');
    try {
      const res = await replacementAllocationService.verifyQr(swapId, scannedValue);
      if (res.success) {
        setSuccessMessage('Đúng pin đã giữ. Có thể tiến hành lắp pin.');
        setStatus('QR_VERIFIED');
        return true;
      }
    } catch (err: any) {
      throw err;
    } finally {
      setBusy(false);
    }
  };

  const handleInstall = async () => {
    setBusy(true);
    setError('');
    setSuccessMessage('');
    try {
      // Step 1: mark allocation as installed (updates battery slot status)
      await replacementAllocationService.install(swapId);
      setIsInstallConfirmOpen(false);
      setSuccessMessage('Đã lắp pin thay thế thành công.');
      setStatus('BATTERY_INSTALLED');

      // Step 2: advance swap workflow to INSTALLED so bước 5 becomes visible
      const batteryCode =
        data?.reservedBattery?.code ||
        data?.reservedBattery?.serialNumber ||
        selectedBattery?.code ||
        selectedBattery?.serialNumber ||
        '';
      if (onInstall) {
        await onInstall(batteryCode);
      }

      onCompleted?.();
      await fetchStatus();
    } catch (err: any) {
      setError(getApiErrorMessage(err) || 'Không thể hoàn tất lắp pin.');
    } finally {
      setBusy(false);
    }
  };

  const handleReportShortage = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await replacementAllocationService.reportShortage(swapId);
      setSuccessMessage(res.message || 'Đã gửi báo cáo thiếu hụt pin đến quản lý trạm.');
    } catch (err: any) {
      setError(getApiErrorMessage(err) || 'Không thể gửi báo cáo thiếu hụt.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Step 3 Main Container Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {/* Header Title & Subtitle */}
        <div className="border-b border-slate-100 pb-5 dark:border-slate-800">
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Bước 3: Phân bổ pin thay thế
          </h2>
          <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
            Hệ thống tìm và giữ pin mới phù hợp từ kho của trạm.
          </p>
        </div>

        {/* Top Requirement Banner */}
        <div className="mt-5 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
            Tiêu chuẩn pin thay thế yêu cầu
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs dark:border-slate-700/80 dark:bg-slate-900">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Loại pin yêu cầu</span>
              <p className="mt-1 text-sm font-extrabold text-slate-900 dark:text-white">
                {data?.requiredBatteryType?.code || 'VF3_LFP_18'}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs dark:border-slate-700/80 dark:bg-slate-900">
              <span className="text-[11px] font-bold text-slate-400 uppercase">SOH yêu cầu</span>
              <p className="mt-1 text-sm font-black text-emerald-600 dark:text-emerald-400">
                100% (Pin mới 100%)
              </p>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs dark:border-slate-700/80 dark:bg-slate-900">
              <span className="text-[11px] font-bold text-slate-400 uppercase">SOC tối thiểu</span>
              <p className="mt-1 text-sm font-black text-emerald-600 dark:text-emerald-400">
                ≥ {data?.minimumSoc || 80}%
              </p>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs dark:border-slate-700/80 dark:bg-slate-900">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Trạm hiện tại</span>
              <div className="mt-1 flex items-center gap-1.5 text-sm font-bold text-slate-800 dark:text-slate-200">
                <Building2 className="h-4 w-4 text-emerald-500" />
                <span>{data?.stationName || 'Trạm HCM 01'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
            <div className="flex-1">{error}</div>
          </div>
        )}

        {/* Global Success Banner */}
        {successMessage && (
          <div className="mt-5 flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Content Body according to status */}
        <div className="mt-6">
          {/* SEARCHING STATE */}
          {loading || status === 'SEARCHING' ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Loader2 className="mb-4 h-10 w-10 animate-spin text-emerald-600" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                Đang tìm pin thay thế phù hợp trong kho...
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Đang đối soát SOH 100%, SOC ≥ 80% và cùng loại pin tại kho trạm
              </p>
            </div>
          ) : status === 'NO_BATTERY_AVAILABLE' || (!selectedBattery && !data?.reservedBattery) ? (
            /* NO_BATTERY_AVAILABLE STATE */
            <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-6 text-center dark:border-amber-900/50 dark:bg-amber-950/20">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/50">
                <Battery className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="text-lg font-bold text-amber-900 dark:text-amber-300">
                Không có pin thay thế phù hợp
              </h3>
              <p className="mx-auto mt-1 max-w-md text-sm text-amber-800 dark:text-amber-400">
                Kho hiện không có pin mới loại <strong className="font-mono">{data?.requiredBatteryType?.code || 'VF3_LFP_18'}</strong> đáp ứng SOH 100% và SOC tối thiểu 80%.
              </p>

              {/* Statistics breakdown */}
              {data?.stats && (
                <div className="my-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl border border-amber-200 bg-white p-3 text-center dark:border-amber-900/60 dark:bg-slate-900">
                    <span className="text-[11px] font-bold text-slate-400 uppercase">Tổng pin cùng loại</span>
                    <p className="mt-1 text-base font-black text-slate-800 dark:text-slate-200">
                      {data.stats.totalSameType}
                    </p>
                  </div>
                  <div className="rounded-xl border border-amber-200 bg-white p-3 text-center dark:border-amber-900/60 dark:bg-slate-900">
                    <span className="text-[11px] font-bold text-slate-400 uppercase">Số pin đang giữ</span>
                    <p className="mt-1 text-base font-black text-amber-600 dark:text-amber-400">
                      {data.stats.reservedCount}
                    </p>
                  </div>
                  <div className="rounded-xl border border-amber-200 bg-white p-3 text-center dark:border-amber-900/60 dark:bg-slate-900">
                    <span className="text-[11px] font-bold text-slate-400 uppercase">Số pin SOC dưới 80%</span>
                    <p className="mt-1 text-base font-black text-amber-600 dark:text-amber-400">
                      {data.stats.lowSocCount}
                    </p>
                  </div>
                  <div className="rounded-xl border border-amber-200 bg-white p-3 text-center dark:border-amber-900/60 dark:bg-slate-900">
                    <span className="text-[11px] font-bold text-slate-400 uppercase">Số pin đang sử dụng</span>
                    <p className="mt-1 text-base font-black text-slate-800 dark:text-slate-200">
                      {data.stats.inUseCount}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap justify-center gap-3">
                <Button variant="outline" size="sm" onClick={() => void fetchStatus()} disabled={busy}>
                  <RefreshCw className="mr-1.5 h-4 w-4" />
                  <span>Kiểm tra lại kho</span>
                </Button>
                <Button variant="secondary" size="sm" onClick={handleReportShortage} loading={busy}>
                  <AlertTriangle className="mr-1.5 h-4 w-4 text-amber-500" />
                  <span>Báo quản lý</span>
                </Button>
              </div>
            </div>
          ) : (
            /* SUGGESTED, RESERVED, QR_VERIFIED, OR INSTALLED STATE */
            <div className="space-y-4">
              {/* Display battery details card */}
              {(selectedBattery || data?.reservedBattery) && (
                <ReplacementBatteryCard
                  battery={(status === 'BATTERY_RESERVED' || status === 'QR_VERIFIED' || status === 'BATTERY_INSTALLED') && data?.reservedBattery ? data.reservedBattery : (selectedBattery || data!.recommendedBattery!)}
                  isReserved={status === 'BATTERY_RESERVED' || status === 'QR_VERIFIED' || status === 'BATTERY_INSTALLED'}
                  isVerified={status === 'QR_VERIFIED' || status === 'BATTERY_INSTALLED'}
                  isInstalled={status === 'BATTERY_INSTALLED'}
                  onSelectOther={() => setIsSelectorOpen(true)}
                  onReserve={() => void handleReserve()}
                  onCancelReservation={() => setIsCancelConfirmOpen(true)}
                  onOpenQrVerification={() => setIsQrModalOpen(true)}
                  onInstall={() => setIsInstallConfirmOpen(true)}
                  busy={busy}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Select Other Battery Modal */}
      {data?.candidates && (
        <ReplacementBatterySelectorModal
          isOpen={isSelectorOpen}
          onClose={() => setIsSelectorOpen(false)}
          candidates={data.candidates}
          onSelectBattery={(b) => {
            setSelectedBattery(b);
            setIsSelectorOpen(false);
          }}
          busy={busy}
        />
      )}

      {/* Battery QR Verification Modal */}
      <BatteryQrVerificationModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        reservedBatteryCode={data?.reservedBattery?.code || selectedBattery?.code || ''}
        storageLocation={data?.reservedBattery?.storageLocation || selectedBattery?.storageLocation}
        onVerify={handleVerifyQr}
        busy={busy}
      />

      {/* Confirm Cancel Reservation Modal */}
      {isCancelConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:border dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Xác nhận hủy giữ pin
            </h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Bạn có chắc muốn hủy giữ pin <strong className="font-mono text-slate-900 dark:text-white">{data?.reservedBattery?.code || selectedBattery?.code}</strong> này?
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <Button variant="outline" size="sm" onClick={() => setIsCancelConfirmOpen(false)} disabled={busy}>
                Không, giữ lại
              </Button>
              <Button variant="danger" size="sm" onClick={handleCancelReservation} loading={busy}>
                Đồng ý hủy
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Install Battery Modal */}
      {isInstallConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:border dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Xác nhận lắp pin vào xe
            </h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Xác nhận pin <strong className="font-mono text-slate-900 dark:text-white">{data?.reservedBattery?.code || selectedBattery?.code}</strong> đã được lắp đúng vào xe?
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <Button variant="outline" size="sm" onClick={() => setIsInstallConfirmOpen(false)} disabled={busy}>
                Hủy
              </Button>
              <Button variant="primary" size="sm" onClick={handleInstall} loading={busy}>
                Xác nhận đã lắp
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
