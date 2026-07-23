import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, ArrowRight, Car, Send, CheckCircle } from "lucide-react";
import { vehicleTransferService } from "../../../services/vehicleTransferService";
import { DocumentUploader, AdditionalDocumentsUploader } from "../../../components/vehicle-transfer/DocumentUploader";
import type { VehicleTransferRequestType } from "../../../types/vehicle-transfer";

const STEPS = [
  { id: 1, title: "Lý do", desc: "Chọn lý do chuyển quyền sở hữu" },
  { id: 2, title: "Chứng từ", desc: "Tải lên các tài liệu pháp lý" },
  { id: 3, title: "Xác nhận", desc: "Kiểm tra và gửi hồ sơ xét duyệt" },
];

const step1Schema = z.object({
  vehicleId: z.string().min(1, "Vehicle ID is required"),
  requestType: z.enum(["USED_VEHICLE_PURCHASE", "LOST_OLD_ACCOUNT", "CHANGED_PHONE_NUMBER", "OTHER"]),
  reason: z.string().max(2000).optional(),
});

const REASON_OPTIONS: { value: VehicleTransferRequestType; label: string; desc: string }[] = [
  { value: "USED_VEHICLE_PURCHASE", label: "Mua xe cũ / chuyển nhượng", desc: "Tôi đã mua/nhận chuyển nhượng chiếc xe này từ chủ cũ" },
  { value: "LOST_OLD_ACCOUNT", label: "Mất tài khoản cũ", desc: "Tôi làm mất thông tin truy cập tài khoản cũ chứa chiếc xe này" },
  { value: "CHANGED_PHONE_NUMBER", label: "Thay đổi số điện thoại", desc: "Số điện thoại của tôi đã thay đổi và không thể xác minh tài khoản cũ" },
  { value: "OTHER", label: "Lý do khác", desc: "Lý do cá nhân khác chưa được liệt kê" },
];

export default function VehicleTransferNew() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const vehicleId = searchParams.get("vehicleId") ?? "";

  const [currentStep, setCurrentStep] = useState(1);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [docs, setDocs] = useState({
    registrationDocumentUrl: undefined as string | undefined,
    identityDocumentUrl: undefined as string | undefined,
    purchaseContractUrl: undefined as string | undefined,
    additionalDocumentUrls: [] as string[],
  });

  const { register, handleSubmit, watch } = useForm<z.infer<typeof step1Schema>>({
    resolver: zodResolver(step1Schema),
    defaultValues: { vehicleId, requestType: "USED_VEHICLE_PURCHASE" },
  });

  const requestType = watch("requestType");

  const handleStep1 = handleSubmit(async (data) => {
    setSubmitting(true);
    setError(null);
    try {
      const request = await vehicleTransferService.createTransferRequest(data);
      setDraftId(request.id);
      setCurrentStep(2);
    } catch (err: any) {
      setError(err?.message ?? "Không thể tạo bản nháp yêu cầu");
    } finally {
      setSubmitting(false);
    }
  });

  const handleStep2 = async () => {
    if (!draftId) return;
    if (!docs.registrationDocumentUrl) { setError("Vui lòng đính kèm Giấy đăng ký xe (Cà vẹt)"); return; }
    if (!docs.identityDocumentUrl) { setError("Vui lòng đính kèm Giấy tờ tùy thân (CCCD/Passport)"); return; }
    if (requestType === "USED_VEHICLE_PURCHASE" && !docs.purchaseContractUrl) {
      setError("Vui lòng đính kèm Hợp đồng mua bán/chuyển nhượng xe"); return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await vehicleTransferService.uploadDocuments(draftId, docs);
      setCurrentStep(3);
    } catch (err: any) {
      setError(err?.message ?? "Không thể tải lên tài liệu");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitFinal = async () => {
    if (!draftId) return;
    setSubmitting(true);
    setError(null);
    try {
      await vehicleTransferService.submitRequest(draftId);
      setSuccess(true);
    } catch (err: any) {
      setError(err?.message ?? "Không thể gửi yêu cầu xét duyệt");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center px-4">
        <div className="max-w-md w-full app-panel p-8 text-center space-y-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 mx-auto">
            <CheckCircle className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">Gửi hồ sơ thành công!</h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">
            Hồ sơ chuyển quyền sở hữu xe đã được gửi đến ban quản trị để xét duyệt. Bạn sẽ nhận được thông báo khi có kết quả.
          </p>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => navigate("/app/vehicle-transfer")}
              className="flex-1 rounded-xl bg-emerald-600 py-3.5 px-4 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700"
            >
              Xem danh sách yêu cầu
            </button>
            <button
              onClick={() => navigate("/app/vehicles")}
              className="flex-1 rounded-xl border border-slate-300 py-3.5 px-4 text-sm font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
            >
              Danh sách xe của tôi
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => currentStep > 1 ? setCurrentStep(currentStep - 1) : navigate(-1)}
            className="mb-6 flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            {currentStep > 1 ? "Quay lại bước trước" : "Quay lại"}
          </button>

          <div className="flex items-center gap-4 mb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800">
              <Car className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white">Yêu cầu chuyển quyền sở hữu xe</h1>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Tạo hồ sơ gửi cho quản trị viên đối soát thông tin</p>
            </div>
          </div>

          {/* Progress */}
          <div className="flex items-center gap-2">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex flex-1 items-center gap-2">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
                    currentStep > s.id
                      ? "bg-emerald-600 text-white"
                      : currentStep === s.id
                      ? "bg-emerald-500 text-white ring-4 ring-emerald-500/20"
                      : "bg-slate-200 text-slate-500 dark:bg-slate-800"
                  }`}
                >
                  {currentStep > s.id ? "✓" : s.id}
                </div>
                <div className="hidden sm:block">
                  <p className={`text-xs font-extrabold ${currentStep === s.id ? "text-slate-900 dark:text-white" : "text-slate-400"}`}>{s.title}</p>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 ${currentStep > s.id ? "bg-emerald-600" : "bg-slate-200 dark:bg-slate-800"}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="app-panel p-6 sm:p-8 space-y-6">
          {currentStep === 1 && (
            <form onSubmit={handleStep1} className="space-y-6">
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white mb-1">{STEPS[0].title}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">{STEPS[0].desc}</p>
              </div>

              <div className="grid gap-3">
                {REASON_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex cursor-pointer items-start gap-4 rounded-xl border p-4 transition ${
                      requestType === opt.value
                        ? "border-emerald-500 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/30"
                        : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900"
                    }`}
                  >
                    <input
                      {...register("requestType")}
                      type="radio"
                      value={opt.value}
                      className="mt-1 accent-emerald-600"
                    />
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{opt.label}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">Mô tả thêm (tùy chọn)</label>
                <textarea
                  {...register("reason")}
                  rows={3}
                  placeholder="Nhập thông tin chi tiết khác..."
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 font-medium placeholder-slate-400 outline-none focus:border-emerald-500 resize-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-600 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400">{error}</div>}

              <button type="submit" disabled={submitting} className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 px-6 font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:opacity-60">
                {submitting ? "Đang khởi tạo..." : <><span>Tiếp tục</span><ArrowRight className="h-4 w-4" /></>}
              </button>
            </form>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white mb-1">{STEPS[1].title}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">{STEPS[1].desc}</p>
              </div>

              <DocumentUploader
                label="Giấy đăng ký xe (Cà vẹt xe)"
                hint="Bản chụp hai mặt giấy đăng ký xe chính chủ hoặc hợp lệ"
                value={docs.registrationDocumentUrl}
                onChange={(url) => setDocs((d) => ({ ...d, registrationDocumentUrl: url }))}
                required
              />
              <DocumentUploader
                label="Giấy tờ tùy thân (CCCD / Hộ chiếu)"
                hint="Bản chụp giấy tờ tùy thân của người yêu cầu"
                value={docs.identityDocumentUrl}
                onChange={(url) => setDocs((d) => ({ ...d, identityDocumentUrl: url }))}
                required
              />
              {requestType === "USED_VEHICLE_PURCHASE" && (
                <DocumentUploader
                  label="Hợp đồng mua bán / Chuyển nhượng"
                  hint="Hợp đồng hoặc giấy ủy quyền mua bán có chữ ký"
                  value={docs.purchaseContractUrl}
                  onChange={(url) => setDocs((d) => ({ ...d, purchaseContractUrl: url }))}
                  required
                />
              )}
              <AdditionalDocumentsUploader
                values={docs.additionalDocumentUrls}
                onChange={(urls) => setDocs((d) => ({ ...d, additionalDocumentUrls: urls }))}
              />

              {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-600 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400">{error}</div>}

              <button onClick={handleStep2} disabled={submitting} className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 px-6 font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:opacity-60">
                {submitting ? "Đang lưu..." : <><span>Tiếp tục</span><ArrowRight className="h-4 w-4" /></>}
              </button>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white mb-1">{STEPS[2].title}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Bằng việc gửi yêu cầu này, bạn cam kết toàn bộ thông tin và chứng từ đính kèm là hoàn toàn chính xác.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 divide-y divide-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:divide-slate-800">
                {[
                  { label: "Lý do chuyển quyền", value: REASON_OPTIONS.find(r => r.value === requestType)?.label },
                  { label: "Cà vẹt xe", value: docs.registrationDocumentUrl ? "✓ Đã tải lên" : "—" },
                  { label: "CCCD / Hộ chiếu", value: docs.identityDocumentUrl ? "✓ Đã tải lên" : "—" },
                  { label: "Hợp đồng mua bán", value: docs.purchaseContractUrl ? "✓ Đã tải lên" : requestType === "USED_VEHICLE_PURCHASE" ? "⚠️ Thiếu" : "Không bắt buộc" },
                  { label: "Tài liệu phụ", value: docs.additionalDocumentUrls.length > 0 ? `${docs.additionalDocumentUrls.length} file` : "Không có" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{item.label}</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">{item.value}</span>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                ⚠️ Trong thời gian chờ xét duyệt, trạng thái xe sẽ được chuyển thành "Chờ chuyển nhượng" để đảm bảo tính an toàn.
              </div>

              {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-600 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400">{error}</div>}

              <button onClick={handleSubmitFinal} disabled={submitting} className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 px-6 font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:opacity-60">
                {submitting ? "Đang gửi hồ sơ..." : <><Send className="h-4 w-4" /><span>Gửi hồ sơ xét duyệt</span></>}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
