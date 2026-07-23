import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, KeyRound, CheckCircle, Mail } from "lucide-react";
import { accountRecoveryService } from "../../../services/accountRecoveryService";

const schema = z.object({
  email: z
    .string()
    .min(1, "Vui lòng nhập địa chỉ Gmail")
    .email("Định dạng Gmail không hợp lệ"),
});

type FormValues = z.infer<typeof schema>;

export default function AccountRecovery() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    setError(null);
    try {
      await accountRecoveryService.requestPasswordReset({ email: data.email });
      setSubmittedEmail(data.email);
      setSuccess(true);
    } catch (err: any) {
      setError(err?.message || "Không thể gửi email. Vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto my-4 max-w-md px-4 py-4">
      <Link
        to="/login"
        className="mb-3 inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Quay lại Đăng nhập
      </Link>

      <div className="app-panel p-6 space-y-4">
        {success ? (
          <div className="text-center space-y-4 py-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 mx-auto">
              <CheckCircle className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white mb-1.5">Đã gửi liên kết khôi phục!</h2>
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400 leading-relaxed">
                Chúng tôi đã gửi đường dẫn đặt lại mật khẩu đến Gmail <strong className="text-slate-900 dark:text-white">{submittedEmail}</strong>. Vui lòng kiểm tra hộp thư (bao gồm cả thư rác / Spam).
              </p>
            </div>
            <button
              onClick={() => navigate("/login")}
              className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-700"
            >
              Quay lại Đăng nhập
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-lg font-black text-slate-900 dark:text-white">Quên mật khẩu?</h1>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Nhập Gmail đăng ký để nhận liên kết đặt lại mật khẩu.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Địa chỉ Gmail</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    {...register("email")}
                    type="email"
                    placeholder="your-email@gmail.com"
                    className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 font-medium placeholder-slate-400 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                {errors.email && <p className="text-xs font-semibold text-red-500 mt-1">{errors.email.message}</p>}
              </div>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-600 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:opacity-60"
              >
                {loading ? "Đang gửi email..." : "Gửi liên kết khôi phục"}
              </button>
            </form>

            <div className="text-center pt-2 border-t border-slate-100 dark:border-slate-800">
              <p className="text-xs text-slate-500">
                Nhớ mật khẩu?{" "}
                <Link to="/login" className="font-bold text-emerald-600 hover:underline dark:text-emerald-400">
                  Đăng nhập ngay
                </Link>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
