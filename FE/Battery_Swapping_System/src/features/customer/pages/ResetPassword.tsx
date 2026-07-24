import { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { KeyRound, CheckCircle, ArrowLeft, Lock } from "lucide-react";
import { accountRecoveryService } from "../../../services/accountRecoveryService";

const schema = z
  .object({
    email: z.string().email("Vui lòng nhập Email hợp lệ"),
    newPassword: z.string().min(8, "Mật khẩu phải có ít nhất 8 ký tự"),
    confirmPassword: z.string().min(8, "Xác nhận mật khẩu phải có ít nhất 8 ký tự"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

export function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";
  const emailParam = searchParams.get("email") || "";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: emailParam,
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: FormValues) => {
    if (!token) {
      setError("Mã mã hóa đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await accountRecoveryService.resetPassword({
        email: data.email,
        otp: token,
        newPassword: data.newPassword,
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err?.message || "Không thể đặt lại mật khẩu. Liên kết có thể đã hết hạn.");
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
              <h2 className="text-xl font-black text-slate-900 dark:text-white mb-1.5">Đặt lại mật khẩu thành công!</h2>
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400 leading-relaxed">
                Mật khẩu của bạn đã được cập nhật. Bạn có thể sử dụng mật khẩu mới để đăng nhập vào hệ thống.
              </p>
            </div>
            <button
              onClick={() => navigate("/login")}
              className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-700"
            >
              Đăng nhập ngay
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-lg font-black text-slate-900 dark:text-white">Đặt lại mật khẩu mới</h1>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Nhập mật khẩu mới cho tài khoản của bạn</p>
              </div>
            </div>

            {!token && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                ⚠️ Không tìm thấy token xác nhận trong đường dẫn. Vui lòng bấm đúng liên kết được gửi trong email.
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Email tài khoản</label>
                <input
                  {...register("email")}
                  type="email"
                  readOnly={Boolean(emailParam)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 font-semibold outline-none read-only:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                {errors.email && <p className="text-xs font-semibold text-red-500 mt-1">{errors.email.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Mật khẩu mới</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    {...register("newPassword")}
                    type="password"
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 font-medium placeholder-slate-400 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                {errors.newPassword && <p className="text-xs font-semibold text-red-500 mt-1">{errors.newPassword.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Xác nhận mật khẩu mới</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    {...register("confirmPassword")}
                    type="password"
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 font-medium placeholder-slate-400 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                {errors.confirmPassword && (
                  <p className="text-xs font-semibold text-red-500 mt-1">{errors.confirmPassword.message}</p>
                )}
              </div>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-600 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !token}
                className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:opacity-50"
              >
                {loading ? "Đang cập nhật..." : "Xác nhận đổi mật khẩu"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default ResetPassword;
