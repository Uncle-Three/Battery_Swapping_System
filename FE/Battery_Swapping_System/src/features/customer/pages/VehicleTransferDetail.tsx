import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, RefreshCw, X, Info } from "lucide-react";
import { vehicleTransferService } from "../../../services/vehicleTransferService";
import { TransferTimeline } from "../../../components/vehicle-transfer/TransferTimeline";
import { TransferStatusBadge } from "../../../components/vehicle-transfer/TransferStatusBadge";
import { DocumentUploader, AdditionalDocumentsUploader } from "../../../components/vehicle-transfer/DocumentUploader";
import type { VehicleTransferRequest } from "../../../types/vehicle-transfer";
import { formatDate } from "../../../utils/format";

export default function VehicleTransferDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [request, setRequest] = useState<VehicleTransferRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [updatingDocs, setUpdatingDocs] = useState(false);
  const [docs, setDocs] = useState({ registrationDocumentUrl: undefined as string | undefined, identityDocumentUrl: undefined as string | undefined, purchaseContractUrl: undefined as string | undefined, additionalDocumentUrls: [] as string[] });

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await vehicleTransferService.getRequestById(id);
      setRequest(data);
      setDocs({
        registrationDocumentUrl: data.registrationDocumentUrl,
        identityDocumentUrl: data.identityDocumentUrl,
        purchaseContractUrl: data.purchaseContractUrl,
        additionalDocumentUrls: data.additionalDocumentUrls,
      });
    } catch (err: any) {
      setError(err?.message ?? "Không thể tải chi tiết yêu cầu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleCancel = async () => {
    if (!id) return;
    setCancelling(true);
    try {
      await vehicleTransferService.cancelRequest(id);
      setShowCancel(false);
      load();
    } catch (err: any) {
      setError(err?.message ?? "Không thể hủy yêu cầu");
    } finally {
      setCancelling(false);
    }
  };

  const handleUpdateDocs = async () => {
    if (!id) return;
    setUpdatingDocs(true);
    try {
      await vehicleTransferService.uploadDocuments(id, docs);
      await vehicleTransferService.submitRequest(id);
      load();
    } catch (err: any) {
      setError(err?.message ?? "Không thể cập nhật hồ sơ");
    } finally {
      setUpdatingDocs(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
      <div className="flex items-center gap-3 font-semibold text-slate-500"><RefreshCw className="h-5 w-5 animate-spin" />Đang tải dữ liệu...</div>
    </div>
  );

  if (error || !request) return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
      <div className="text-center font-bold text-red-600">{error || "Không tìm thấy hồ sơ"}</div>
    </div>
  );

  const canCancel = ["DRAFT", "PENDING", "NEED_MORE_INFORMATION"].includes(request.status);
  const needsMoreInfo = request.status === "NEED_MORE_INFORMATION";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <button onClick={() => navigate("/app/vehicle-transfer")} className="mb-6 flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
          <ArrowLeft className="h-4 w-4" />Quay lại danh sách
        </button>

        <div className="flex items-start justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-black text-slate-900 dark:text-white">Chi tiết Hồ sơ Chuyển nhượng</h1>
              <TransferStatusBadge status={request.status} />
            </div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Tạo ngày {formatDate(request.createdAt)}</p>
          </div>
          {canCancel && (
            <button
              onClick={() => setShowCancel(true)}
              className="flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50 dark:border-red-800 dark:bg-slate-900 dark:text-red-400"
            >
              <X className="h-4 w-4" />Hủy yêu cầu
            </button>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* Left: Details */}
          <div className="space-y-6">
            {/* Vehicle info */}
            <div className="app-panel p-6">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Thông tin xe</h3>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Biển số xe", value: request.vehicle?.plateNumber ?? "—" },
                  { label: "Số VIN", value: request.vehicle?.vinNumber ?? "—" },
                  { label: "Hãng xe", value: request.vehicle?.brand ?? "—" },
                  { label: "Dòng xe", value: request.vehicle?.model ?? "—" },
                ].map((item) => (
                  <div key={item.label}>
                    <p className="text-xs text-slate-500">{item.label}</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Additional info request */}
            {needsMoreInfo && request.additionalInfoRequest && (
              <div className="rounded-2xl border border-orange-200 bg-orange-50/90 p-6 space-y-4 dark:border-orange-800 dark:bg-orange-950/30">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-extrabold text-slate-900 dark:text-white mb-1">Cần bổ sung chứng từ</h3>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{request.additionalInfoRequest}</p>
                  </div>
                </div>

                <div className="border-t border-orange-200 dark:border-orange-800 pt-4 space-y-4">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">Cập nhật tài liệu mới và gửi lại:</p>
                  <DocumentUploader label="Cà vẹt xe" value={docs.registrationDocumentUrl} onChange={(url) => setDocs((d) => ({ ...d, registrationDocumentUrl: url }))} required />
                  <DocumentUploader label="Giấy tờ tùy thân" value={docs.identityDocumentUrl} onChange={(url) => setDocs((d) => ({ ...d, identityDocumentUrl: url }))} required />
                  <DocumentUploader label="Hợp đồng mua bán" value={docs.purchaseContractUrl} onChange={(url) => setDocs((d) => ({ ...d, purchaseContractUrl: url }))} />
                  <AdditionalDocumentsUploader values={docs.additionalDocumentUrls} onChange={(urls) => setDocs((d) => ({ ...d, additionalDocumentUrls: urls }))} />
                  <button onClick={handleUpdateDocs} disabled={updatingDocs} className="w-full rounded-xl bg-orange-600 py-3 text-sm font-bold text-white shadow-md transition hover:bg-orange-700 disabled:opacity-60">
                    {updatingDocs ? "Đang gửi lại..." : "Cập nhật & Gửi lại hồ sơ"}
                  </button>
                </div>
              </div>
            )}

            {/* Documents */}
            <div className="app-panel p-6">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Chứng từ đã nộp</h3>
              <div className="space-y-3">
                {[
                  { label: "Giấy đăng ký xe (Cà vẹt)", url: request.registrationDocumentUrl },
                  { label: "Giấy tờ tùy thân", url: request.identityDocumentUrl },
                  { label: "Hợp đồng mua bán", url: request.purchaseContractUrl },
                ].map((doc) => (
                  <div key={doc.label} className="flex items-center justify-between text-sm py-1 border-b border-slate-100 last:border-0 dark:border-slate-800">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{doc.label}</span>
                    {doc.url ? (
                      <a href={doc.url} target="_blank" rel="noopener noreferrer" className="font-bold text-emerald-600 hover:underline dark:text-emerald-400">
                        Xem chứng từ →
                      </a>
                    ) : (
                      <span className="text-slate-400">Chưa cung cấp</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Timeline */}
          <div className="app-panel p-6">
            <TransferTimeline request={request} />
          </div>
        </div>

        {/* Cancel confirmation */}
        {showCancel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm">
            <div className="w-full max-w-sm app-panel p-6 space-y-4">
              <h3 className="font-extrabold text-slate-900 text-lg dark:text-white">Xác nhận hủy yêu cầu?</h3>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Hành động này không thể hoàn tác. Trạng thái xe sẽ được khôi phục.</p>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowCancel(false)} className="flex-1 rounded-xl border border-slate-300 bg-white py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">Không</button>
                <button onClick={handleCancel} disabled={cancelling} className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60">
                  {cancelling ? "Đang hủy..." : "Xác nhận Hủy"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
