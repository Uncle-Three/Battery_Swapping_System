import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, CheckCircle, AlertTriangle } from "lucide-react";
import { adminVehicleTransferService } from "../../services/adminVehicleTransferService";

const approveSchema = z.object({ adminNotes: z.string().max(2000).optional() });
const rejectSchema = z.object({
  rejectionReason: z.string().min(10, "Lý do từ chối phải có ít nhất 10 ký tự").max(1000),
  adminNotes: z.string().max(2000).optional(),
});

interface ApproveTransferModalProps {
  requestId: string;
  vehiclePlate: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function ApproveTransferModal({ requestId, vehiclePlate, onClose, onSuccess }: ApproveTransferModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit } = useForm<z.infer<typeof approveSchema>>({ resolver: zodResolver(approveSchema) });

  const onSubmit = async (data: z.infer<typeof approveSchema>) => {
    setSubmitting(true);
    setError(null);
    try {
      await adminVehicleTransferService.approveRequest(requestId, data);
      onSuccess();
    } catch (err: any) {
      setError(err?.message ?? "Không thể phê duyệt yêu cầu.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="space-y-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 shrink-0">
            <CheckCircle className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Phê duyệt chuyển quyền sở hữu</h2>
            <p className="text-sm text-slate-500 mt-1">
              Bạn chuẩn bị duyệt quyền sở hữu xe biển số <strong className="text-slate-900 dark:text-white">{vehiclePlate}</strong>. Hành động này sẽ thay đổi chủ xe chính thức.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">Ghi chú của quản trị viên (tùy chọn)</label>
            <textarea
              {...register("adminNotes")}
              rows={3}
              placeholder="Nhập ghi chú hoặc lý do phê duyệt..."
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-emerald-500 resize-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-600 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60 shadow-md shadow-emerald-600/20"
            >
              {submitting ? "Đang xử lý..." : "Xác nhận Phê duyệt"}
            </button>
          </div>
        </form>
      </div>
    </ModalOverlay>
  );
}

interface RejectTransferModalProps {
  requestId: string;
  vehiclePlate: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function RejectTransferModal({ requestId, vehiclePlate, onClose, onSuccess }: RejectTransferModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors } } = useForm<z.infer<typeof rejectSchema>>({ resolver: zodResolver(rejectSchema) });

  const onSubmit = async (data: z.infer<typeof rejectSchema>) => {
    setSubmitting(true);
    setError(null);
    try {
      await adminVehicleTransferService.rejectRequest(requestId, data);
      onSuccess();
    } catch (err: any) {
      setError(err?.message ?? "Không thể từ chối yêu cầu.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="space-y-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400 shrink-0">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Từ chối yêu cầu chuyển quyền</h2>
            <p className="text-sm text-slate-500 mt-1">
              Từ chối yêu cầu cho xe biển số <strong className="text-slate-900 dark:text-white">{vehiclePlate}</strong>. Vui lòng cung cấp lý do cụ thể.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">Lý do từ chối <span className="text-red-500">*</span></label>
            <textarea
              {...register("rejectionReason")}
              rows={3}
              placeholder="Giải thích rõ lý do không chấp nhận hồ sơ..."
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-red-500 resize-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
            {errors.rejectionReason && <p className="text-xs font-semibold text-red-500 mt-1">{errors.rejectionReason.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">Ghi chú quản trị viên (tùy chọn)</label>
            <textarea
              {...register("adminNotes")}
              rows={2}
              placeholder="Ghi chú nội bộ..."
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-slate-400 resize-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-600 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60 shadow-md shadow-red-600/20"
            >
              {submitting ? "Đang xử lý..." : "Xác nhận Từ chối"}
            </button>
          </div>
        </form>
      </div>
    </ModalOverlay>
  );
}

function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in fade-in zoom-in-95">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
        {children}
      </div>
    </div>
  );
}
