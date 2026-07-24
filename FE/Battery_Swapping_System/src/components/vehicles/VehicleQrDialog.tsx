import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { X, Copy, Download, Maximize2, RefreshCw } from "lucide-react";
import { vehicleService } from "../../services/vehicleService";
import type { BatteryQrData } from "../../types/vehicle";

const extractBatteryCode = (code: string | undefined | null) => {
  if (!code) return 'Chưa có Pin';
  if (code.includes('batteryCode=')) {
    const match = code.match(/batteryCode=([^&]*)/);
    if (match && match[1]) return match[1];
  }
  return code.split('/').pop() || code;
};

interface VehicleQrDialogProps {
  vehicleId: string;
  onClose: () => void;
}

export function VehicleQrDialog({ vehicleId, onClose }: VehicleQrDialogProps) {
  const [qrData, setQrData] = useState<BatteryQrData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  console.log(copied);
  const [fullscreen, setFullscreen] = useState(false);

  const fetchQr = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await vehicleService.getBatteryQr(vehicleId);
      setQrData(data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Không thể tải mã QR");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQr();
  }, [vehicleId]);

  const handleCopy = () => {
    if (qrData) {
      navigator.clipboard.writeText(extractBatteryCode(qrData.batteryCode));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    const svg = document.getElementById("battery-qr-svg");
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width + 40;
      canvas.height = img.height + 40;
      if (ctx) {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 20, 20);
        const pngFile = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.download = `QR-${extractBatteryCode(qrData?.batteryCode)}.png`;
        downloadLink.href = `${pngFile}`;
        downloadLink.click();
      }
    };
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  if (fullscreen && qrData) {
    return (
      <div className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center p-8">
        <button onClick={() => setFullscreen(false)} className="absolute top-8 right-8 p-4 bg-slate-100 rounded-full hover:bg-slate-200">
          <X className="w-8 h-8" />
        </button>
        <QRCodeSVG value={qrData.scanUrl || qrData.qrCodeValue} size={400} id="battery-qr-svg" />
        <h2 className="mt-12 text-4xl font-mono font-bold">{extractBatteryCode(qrData.batteryCode)}</h2>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50 dark:bg-slate-800">
          <h2 className="text-lg font-bold">Mã QR Pin</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full dark:hover:bg-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-8 flex flex-col items-center">
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin mb-4" />
              <span>Đang tạo mã QR bảo mật...</span>
            </div>
          ) : error ? (
            <div className="h-64 flex flex-col items-center justify-center text-red-500 text-center">
              <p className="font-semibold mb-4">{error}</p>
              <button onClick={fetchQr} className="px-4 py-2 border rounded-lg hover:bg-slate-50">Thử lại</button>
            </div>
          ) : qrData ? (
            <>
              <div className="bg-white p-4 rounded-2xl border shadow-sm mb-6 cursor-pointer hover:shadow-md transition" onClick={() => setFullscreen(true)}>
                <QRCodeSVG value={qrData.scanUrl || qrData.qrCodeValue} size={200} id="battery-qr-svg" />
              </div>
              
              <div className="text-center w-full">
                <p className="text-sm text-slate-500 mb-1">Mã Pin</p>
                <div className="flex items-center justify-center gap-2 mb-6">
                  <p className="font-mono font-bold text-lg">{extractBatteryCode(qrData.batteryCode)}</p>
                  <button onClick={handleCopy} className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition" title="Copy mã">
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex justify-center gap-4 w-full">
                <button onClick={handleDownload} className="flex-1 py-2.5 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl font-semibold transition">
                  <Download className="w-4 h-4" /> Tải xuống
                </button>
                <button onClick={() => setFullscreen(true)} className="flex-1 py-2.5 flex items-center justify-center gap-2 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 rounded-xl font-semibold transition">
                  <Maximize2 className="w-4 h-4" /> Phóng to
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
