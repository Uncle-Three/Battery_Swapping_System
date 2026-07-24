import type { FC } from 'react';
import { Badge } from '../../../../../components/ui/Badge';
import { Button } from '../../../../../components/ui/Button';
import { Battery, Calendar, MapPin, CheckCircle2, ShieldCheck, Cpu } from 'lucide-react';

export interface BatteryCandidate {
  id: string;
  code: string;
  serialNumber: string;
  batteryType: string;
  soh: number;
  soc: number;
  condition: string;
  status: string;
  storageLocation: string;
  receivedAt: string | Date;
}

interface ReplacementBatteryCardProps {
  battery: BatteryCandidate;
  isReserved?: boolean;
  onSelectOther?: () => void;
  onReserve?: () => void;
  onCancelReservation?: () => void;
  onOpenQrVerification?: () => void;
  onInstall?: () => void;
  isVerified?: boolean;
  isInstalled?: boolean;
  busy?: boolean;
}

const formatDate = (dateStr: string | Date) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return String(dateStr);
  }
};

export const ReplacementBatteryCard: FC<ReplacementBatteryCardProps> = ({
  battery,
  isReserved = false,
  onSelectOther,
  onReserve,
  onCancelReservation,
  onOpenQrVerification,
  onInstall,
  isVerified = false,
  isInstalled = false,
  busy = false,
}) => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
      {/* Top Badges */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="success" className="inline-flex items-center gap-1">
            <ShieldCheck className="h-3 w-3" />
            <span>Pin mới 100%</span>
          </Badge>
          <Badge variant="info" className="inline-flex items-center gap-1">
            <Cpu className="h-3 w-3" />
            <span>Phù hợp với xe</span>
          </Badge>
          <Badge variant={isInstalled ? 'success' : isReserved ? 'warning' : 'success'}>
            {isInstalled ? 'Đã lắp vào xe' : isReserved ? 'Đã giữ pin' : 'Sẵn sàng'}
          </Badge>
        </div>
        {isVerified && !isInstalled && (
          <Badge variant="success" className="inline-flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Đã xác minh QR</span>
          </Badge>
        )}
      </div>

      {/* Main Details Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Mã pin</p>
          <p className="mt-1 font-mono text-base font-extrabold text-slate-900 dark:text-white">
            {battery.code || battery.serialNumber}
          </p>
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Số serial</p>
          <p className="mt-1 font-mono text-sm font-semibold text-slate-700 dark:text-slate-300">
            {battery.serialNumber || battery.code}
          </p>
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Loại pin</p>
          <p className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-200">
            {battery.batteryType}
          </p>
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Sức khỏe / Dung lượng</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
              SOH {battery.soh}%
            </span>
            <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
              SOC {battery.soc}%
            </span>
          </div>
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Vị trí kho</p>
          <div className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
            <MapPin className="h-3.5 w-3.5 text-slate-400" />
            <span>{battery.storageLocation || 'Kệ A - Ô 05'}</span>
          </div>
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Ngày nhập kho</p>
          <div className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <span>{formatDate(battery.receivedAt)}</span>
          </div>
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Trạng thái vận hành</p>
          <div className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-800 dark:text-slate-200">
            <Battery className="h-3.5 w-3.5 text-emerald-500" />
            <span>{isInstalled ? 'Đã lắp vào xe' : isReserved ? 'Đã giữ cho giao dịch' : 'Sẵn sàng thay thế'}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons Toolbar */}
      {!isInstalled && (
        <div className="mt-5 flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
          {!isReserved ? (
            <>
              {onSelectOther && (
                <Button variant="outline" size="sm" onClick={onSelectOther} disabled={busy}>
                  Chọn pin khác
                </Button>
              )}
              {onReserve && (
                <Button variant="primary" size="sm" onClick={onReserve} loading={busy}>
                  Giữ pin này
                </Button>
              )}
            </>
          ) : (
            <>
              {onCancelReservation && !isVerified && (
                <Button variant="outline" size="sm" onClick={onCancelReservation} disabled={busy}>
                  Hủy giữ pin
                </Button>
              )}
              {onOpenQrVerification && !isVerified && (
                <Button variant="primary" size="sm" onClick={onOpenQrVerification} disabled={busy}>
                  Quét QR pin để xác nhận
                </Button>
              )}
              {isVerified && onInstall && (
                <Button variant="primary" size="sm" onClick={onInstall} loading={busy}>
                  Gắn đúng pin đã giữ
                </Button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
