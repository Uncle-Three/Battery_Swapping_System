import { useState, type FC, type ChangeEvent } from 'react';
import { Button } from '../../../../../components/ui/Button';
import { X, QrCode, Upload, AlertTriangle, Loader2 } from 'lucide-react';
import jsQR from 'jsqr';

interface BatteryQrVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservedBatteryCode: string;
  storageLocation?: string;
  onVerify: (scannedValue: string) => Promise<boolean | void>;
  busy?: boolean;
}

export const BatteryQrVerificationModal: FC<BatteryQrVerificationModalProps> = ({
  isOpen,
  onClose,
  reservedBatteryCode,
  storageLocation = 'Kệ A - Ô 05',
  onVerify,
  busy = false,
}) => {
  const [errorMessage, setErrorMessage] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scannedCode, setScannedCode] = useState('');

  if (!isOpen) return null;

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    setErrorMessage('');
    setScannedCode('');

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code && code.data) {
            setScannedCode(code.data);
            try {
              const ok = await onVerify(code.data);
              if (ok) onClose();
            } catch (err: any) {
              setErrorMessage(
                err?.response?.data?.message ||
                  `Pin vừa quét không phải pin đã được giữ cho giao dịch này. Vui lòng lấy đúng pin ${reservedBatteryCode} tại ${storageLocation}.`
              );
            }
          } else {
            setErrorMessage('Không tìm thấy mã QR hợp lệ trong ảnh tải lên. Vui lòng thử lại với ảnh mã QR rõ hơn.');
          }
        }
        setIsScanning(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="relative flex w-full max-w-lg flex-col rounded-2xl bg-white p-6 shadow-2xl dark:border dark:border-slate-800 dark:bg-slate-900">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-emerald-100 p-2 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Quét QR xác nhận pin đã giữ
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Lấy đúng pin <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{reservedBatteryCode}</span> tại <span className="font-semibold text-slate-800 dark:text-slate-200">{storageLocation}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* File Upload Scanner */}
        <div className="mt-5 space-y-4">
          <div className="relative flex items-center justify-center">
            <label className="flex min-h-36 w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/80 p-6 text-center transition-all hover:border-emerald-500 hover:bg-emerald-50/50 dark:border-slate-700 dark:bg-slate-800/80 dark:hover:border-emerald-500 dark:hover:bg-emerald-950/30">
              {isScanning ? (
                <>
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-600 dark:text-emerald-400" />
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Đang quét mã QR từ ảnh...</span>
                </>
              ) : (
                <>
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400">
                    <Upload className="h-6 w-6" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      Nhấp vào đây để tải ảnh chứa mã QR pin
                    </span>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Hệ thống sẽ tự động quét và đối chiếu với mã pin đã giữ
                    </p>
                  </div>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                disabled={isScanning || busy}
                className="hidden"
              />
            </label>
          </div>

          {scannedCode && !errorMessage && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
              Mã QR phát hiện từ ảnh: <strong className="font-mono">{scannedCode}</strong>
            </div>
          )}

          {errorMessage && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                <div className="space-y-1">
                  <p className="font-bold">{errorMessage}</p>
                  <p className="text-slate-600 dark:text-slate-400">
                    Vui lòng kiểm tra lại pin tại <strong className="text-slate-900 dark:text-white">{storageLocation}</strong> và tải lại đúng ảnh mã QR của pin <strong className="font-mono text-slate-900 dark:text-white">{reservedBatteryCode}</strong>.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end border-t border-slate-100 pt-4 dark:border-slate-800">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={busy || isScanning}>
              Đóng
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
