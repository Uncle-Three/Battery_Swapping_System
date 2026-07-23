import { AlertTriangle, ArrowRight, ShieldCheck, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { VehicleLookupResponse } from "../../types/vehicle-transfer";

interface ExistingOwnerWarningProps {
  lookup: VehicleLookupResponse;
  onRecoverAccount?: () => void;
  onRequestTransfer?: () => void;
}

export function ExistingOwnerWarning({ lookup, onRecoverAccount, onRequestTransfer }: ExistingOwnerWarningProps) {
  const navigate = useNavigate();

  if (lookup.isOwnedByCurrentUser) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-6 dark:border-emerald-800 dark:bg-emerald-950/30">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400 shrink-0">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-extrabold text-slate-900 dark:text-white mb-1">Xe đã có trong tài khoản của bạn</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">{lookup.message}</p>
            {lookup.vehicle && (
              <button
                onClick={() => navigate(`/app/vehicles/${lookup.vehicle!.id}`)}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-700 shadow-md shadow-emerald-500/10"
              >
                Xem chi tiết xe <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/90 p-6 space-y-5 dark:border-amber-800/60 dark:bg-amber-950/20">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400 shrink-0">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <div>
          <h3 className="font-extrabold text-slate-900 dark:text-white mb-1">Xe đã liên kết với một tài khoản khác</h3>
          <p className="text-sm text-slate-600 dark:text-slate-300">{lookup.message}</p>
        </div>
      </div>

      {lookup.maskedOwnerInfo && (
        <div className="rounded-xl border border-amber-200/80 bg-white/80 p-4 space-y-1 dark:border-amber-900/50 dark:bg-slate-900/60">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Thông tin chủ xe hiện tại (đã che mờ)</p>
          {lookup.maskedOwnerInfo.maskedEmail && (
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Email: <span className="font-mono">{lookup.maskedOwnerInfo.maskedEmail}</span></p>
          )}
          {lookup.maskedOwnerInfo.maskedPhone && (
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">SĐT: <span className="font-mono">{lookup.maskedOwnerInfo.maskedPhone}</span></p>
          )}
        </div>
      )}

      {lookup.activeTransferStatus && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-800 dark:bg-blue-950/40">
          <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
            ⏳ Đã có yêu cầu chuyển quyền sở hữu đang được xử lý (Trạng thái: <strong>{lookup.activeTransferStatus}</strong>).
          </p>
        </div>
      )}

      {lookup.transferRequestAllowed && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 pt-1">
          <button
            onClick={() => onRecoverAccount ? onRecoverAccount() : navigate("/account-recovery")}
            className="flex items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-white px-5 py-3 text-sm font-bold text-emerald-700 hover:bg-emerald-50 shadow-sm transition dark:border-emerald-800 dark:bg-slate-900 dark:text-emerald-400"
          >
            <RefreshCw className="h-4 w-4" />
            Khôi phục tài khoản cũ
          </button>
          <button
            onClick={() => onRequestTransfer?.()}
            className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition"
          >
            <ArrowRight className="h-4 w-4" />
            Gửi yêu cầu chuyển quyền sở hữu
          </button>
        </div>
      )}
    </div>
  );
}
