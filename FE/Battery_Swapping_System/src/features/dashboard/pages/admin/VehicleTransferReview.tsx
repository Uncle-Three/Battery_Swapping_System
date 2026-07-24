import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, RefreshCw, CheckCircle, XCircle, HelpCircle } from "lucide-react";
import { adminVehicleTransferService } from "../../../../services/adminVehicleTransferService";
import { ApproveTransferModal, RejectTransferModal } from "../../../../components/vehicle-transfer/TransferModals";
import { TransferStatusBadge } from "../../../../components/vehicle-transfer/TransferStatusBadge";
import { TransferTimeline } from "../../../../components/vehicle-transfer/TransferTimeline";
import { DocumentPreviewCard } from "../../../../components/vehicle-transfer/DocumentPreviewCard";
import { formatDate } from "../../../../utils/format";
import type { VehicleTransferRequest } from "../../../../types/vehicle-transfer";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const requestInfoSchema = z.object({
  additionalInfoRequest: z.string().min(10, "Nhập yêu cầu ít nhất 10 ký tự"),
  adminNotes: z.string().max(2000).optional(),
});

const REASON_LABELS: Record<VehicleTransferRequest["requestType"], string> = {
  USED_VEHICLE_PURCHASE: "Mua xe cũ",
  LOST_OLD_ACCOUNT: "Mất tài khoản cũ",
  CHANGED_PHONE_NUMBER: "Đổi SĐT",
  OTHER: "Khác",
};

export default function VehicleTransferReview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [request, setRequest] = useState<VehicleTransferRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showApprove, setShowApprove] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [showInfoRequest, setShowInfoRequest] = useState(false);
  const [submittingInfo, setSubmittingInfo] = useState(false);

  const infoForm = useForm<z.infer<typeof requestInfoSchema>>({ resolver: zodResolver(requestInfoSchema) });

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await adminVehicleTransferService.getRequestDetail(id);
      setRequest(data);
    } catch (err: any) {
      setError(err?.message ?? "Không thể tải hồ sơ xét duyệt");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleRequestInfo = async (data: z.infer<typeof requestInfoSchema>) => {
    if (!id) return;
    setSubmittingInfo(true);
    try {
      await adminVehicleTransferService.requestMoreInfo(id, data);
      setShowInfoRequest(false);
      load();
    } catch (err: any) {
      setError(err?.message ?? "Không thể gửi yêu cầu bổ sung thông tin");
    } finally {
      setSubmittingInfo(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="flex items-center gap-3 font-semibold text-slate-500"><RefreshCw className="h-5 w-5 animate-spin" />Đang tải hồ sơ...</div>
    </div>
  );

  if (error || !request) return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4 font-bold text-red-600 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400">{error || "Không tìm thấy hồ sơ"}</div>
  );

  const canApprove = ["PENDING", "UNDER_REVIEW", "NEED_MORE_INFORMATION"].includes(request.status);
  const canReject = ["PENDING", "UNDER_REVIEW", "NEED_MORE_INFORMATION"].includes(request.status);
  const canRequestInfo = ["PENDING", "UNDER_REVIEW"].includes(request.status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/admin/vehicle-transfers")} className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-black text-slate-900 dark:text-white">Xét duyệt Hồ sơ Chuyển quyền</h1>
              <TransferStatusBadge status={request.status} />
            </div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5">Tạo ngày {formatDate(request.createdAt)}</p>
          </div>
        </div>
        <button onClick={load} className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Action buttons */}
      {(canApprove || canReject || canRequestInfo) && (
        <div className="flex flex-wrap gap-3">
          {canApprove && (
            <button
              onClick={() => setShowApprove(true)}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-700"
            >
              <CheckCircle className="h-4 w-4" />Duyệt chuyển quyền
            </button>
          )}
          {canRequestInfo && (
            <button
              onClick={() => setShowInfoRequest(!showInfoRequest)}
              className="flex items-center gap-2 rounded-xl border border-orange-300 bg-orange-50 px-5 py-2.5 text-sm font-bold text-orange-700 hover:bg-orange-100 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-300"
            >
              <HelpCircle className="h-4 w-4" />Yêu cầu bổ sung chứng từ
            </button>
          )}
          {canReject && (
            <button
              onClick={() => setShowReject(true)}
              className="flex items-center gap-2 rounded-xl border border-red-200 bg-white px-5 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 dark:border-red-800 dark:bg-slate-900 dark:text-red-400"
            >
              <XCircle className="h-4 w-4" />Từ chối
            </button>
          )}
        </div>
      )}

      {/* Request More Info inline form */}
      {showInfoRequest && (
        <div className="rounded-2xl border border-orange-200 bg-orange-50 p-5 space-y-4 dark:border-orange-800 dark:bg-orange-950/40">
          <h3 className="font-extrabold text-slate-900 dark:text-white">Yêu cầu bổ sung thêm tài liệu</h3>
          <form onSubmit={infoForm.handleSubmit(handleRequestInfo)} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">Nội dung thông tin cần yêu cầu người dùng bổ sung *</label>
              <textarea
                {...infoForm.register("additionalInfoRequest")}
                rows={3}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 font-medium placeholder-slate-400 outline-none focus:border-orange-500 resize-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                placeholder="Ví dụ: Vui lòng cung cấp ảnh chụp Giấy đăng ký xe rõ nét hơn..."
              />
              {infoForm.formState.errors.additionalInfoRequest && (
                <p className="text-xs font-semibold text-red-500 mt-1">{infoForm.formState.errors.additionalInfoRequest.message}</p>
              )}
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowInfoRequest(false)} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                Hủy
              </button>
              <button type="submit" disabled={submittingInfo} className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-bold text-white hover:bg-orange-700 disabled:opacity-60">
                {submittingInfo ? "Đang gửi..." : "Gửi yêu cầu"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Left column */}
        <div className="space-y-6">
          {/* Vehicle */}
          <div className="app-panel p-6">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Thông tin đối soát xe</h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {[
                { label: "Biển số xe", value: request.vehicle?.plateNumber },
                { label: "Số VIN", value: request.vehicle?.vinNumber },
                { label: "Hãng xe", value: request.vehicle?.brand },
                { label: "Dòng xe", value: request.vehicle?.model },
                { label: "Trạng thái sở hữu", value: request.vehicle?.ownershipStatus ? (request.vehicle.ownershipStatus === "ACTIVE" ? "Đang hoạt động" : request.vehicle.ownershipStatus === "TRANSFER_PENDING" ? "Đang chờ chuyển quyền" : request.vehicle.ownershipStatus === "LOCKED" ? "Đang khóa" : request.vehicle.ownershipStatus) : "—" },
                { label: "Loại yêu cầu", value: REASON_LABELS[request.requestType] },
              ].map((item) => (
                <div key={item.label}>
                  <p className="text-xs text-slate-500">{item.label}</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{item.value || "—"}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Reason */}
          {request.reason && (
            <div className="app-panel p-6">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Lý do từ người đăng ký</h3>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{request.reason}</p>
            </div>
          )}

          {/* Documents */}
          <div className="app-panel p-6">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Chứng từ thẩm định</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { label: "Giấy đăng ký xe (Cà vẹt)", url: request.registrationDocumentUrl, required: true },
                { label: "Giấy tờ tùy thân (CCCD)", url: request.identityDocumentUrl, required: true },
                { label: "Hợp đồng chuyển nhượng", url: request.purchaseContractUrl, required: request.requestType === "USED_VEHICLE_PURCHASE" },
              ].map((doc) => (
                <DocumentPreviewCard
                  key={doc.label}
                  label={doc.label}
                  url={doc.url}
                  required={doc.required}
                />
              ))}

              {request.additionalDocumentUrls.map((url, i) => (
                <DocumentPreviewCard
                  key={i}
                  label={`Tài liệu bổ sung ${i + 1}`}
                  url={url}
                  required={false}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Right: Timeline */}
        <div className="app-panel p-6">
          <TransferTimeline request={request} />
        </div>
      </div>

      {/* Modals */}
      {showApprove && (
        <ApproveTransferModal
          requestId={request.id}
          vehiclePlate={request.vehicle?.plateNumber ?? ""}
          onClose={() => setShowApprove(false)}
          onSuccess={() => { setShowApprove(false); load(); }}
        />
      )}
      {showReject && (
        <RejectTransferModal
          requestId={request.id}
          vehiclePlate={request.vehicle?.plateNumber ?? ""}
          onClose={() => setShowReject(false)}
          onSuccess={() => { setShowReject(false); load(); }}
        />
      )}
    </div>
  );
}
