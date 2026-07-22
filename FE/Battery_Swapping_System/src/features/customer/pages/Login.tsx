import { useCallback, useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { BatteryCharging, User, Zap, Wrench, ClipboardList, ShieldCheck, ArrowRight, Loader2, KeyRound } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { GoogleLoginButton } from '../../../components/auth/GoogleLoginButton';
import { roleDashboard } from '../../../constants/routes';
import { useAuth } from '../../../hooks/useAuth';
import { authService, type AuthResponse } from '../../../services/authService';
import { ApiClientError, getApiErrorMessage } from '../../../services/apiClient';

const DEMO_ACCOUNTS = [
  {
    role: 'Member',
    title: 'Khách hàng (Member)',
    email: 'member@batteryswap.local',
    icon: User,
    color: 'emerald',
    desc: 'Đặt lịch đổi pin, quản lý xe điện',
    route: '/app/bookings/new',
  },
  {
    role: 'Staff',
    title: 'Nhân viên trạm (Staff)',
    email: 'staff@batteryswap.local',
    icon: Zap,
    color: 'blue',
    desc: 'Xác minh khách, thực hiện thay pin',
    route: '/staff/dashboard',
  },
  {
    role: 'Technician',
    title: 'Kỹ thuật viên (Technician)',
    email: 'technician@batteryswap.local',
    icon: Wrench,
    color: 'amber',
    desc: 'Kiểm tra SoH pin, lập phiếu bảo trì',
    route: '/staff/dashboard',
  },
  {
    role: 'Manager',
    title: 'Quản lý trạm (Manager)',
    email: 'manager@batteryswap.local',
    icon: ClipboardList,
    color: 'purple',
    desc: 'Duyệt lịch hẹn, quản lý kho & báo cáo',
    route: '/manager/dashboard',
  },
  {
    role: 'Admin',
    title: 'Quản trị viên (Admin)',
    email: 'admin@batteryswap.local',
    icon: ShieldCheck,
    color: 'rose',
    desc: 'Quản lý người dùng, trạm & phân công',
    route: '/admin/dashboard',
  },
];

const GOOGLE_LOGIN_CONFIGURED = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [quickLoadingEmail, setQuickLoadingEmail] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const finishLogin = useCallback(
    (data: AuthResponse, targetRoute?: string) => {
      login(data.accessToken, data.user);
      const requested = (location.state as { from?: string } | null)?.from;
      const dest = targetRoute || (requested && requested !== '/login' ? requested : roleDashboard(data.user.role));
      navigate(dest, { replace: true });
    },
    [location.state, login, navigate],
  );

  if (isAuthenticated && user) return <Navigate to={roleDashboard(user.role)} replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await authService.login({ email, password });
      finishLogin(data);
    } catch (cause) {
      setError(getApiErrorMessage(cause, 'Không thể đăng nhập.'));
      if (cause instanceof ApiClientError && cause.code === 'EMAILVERIFICATIONREQUIRED') {
        navigate(`/verify-email?email=${encodeURIComponent(email)}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (acc: typeof DEMO_ACCOUNTS[0]) => {
    setQuickLoadingEmail(acc.email);
    setError('');
    try {
      const data = await authService.login({ email: acc.email, password: '123456' });
      finishLogin(data, acc.route);
    } catch (cause) {
      setError(getApiErrorMessage(cause, `Không thể đăng nhập tài khoản ${acc.title}.`));
    } finally {
      setQuickLoadingEmail(null);
    }
  };

  const loginWithGoogle = useCallback(
    async (idToken: string) => {
      setGoogleLoading(true);
      setError('');
      try {
        const data = await authService.googleLogin(idToken);
        finishLogin(data);
      } catch (cause) {
        setError(getApiErrorMessage(cause, 'Không thể đăng nhập bằng Google.'));
      } finally {
        setGoogleLoading(false);
      }
    },
    [finishLogin],
  );

  return (
    <div className="mx-auto my-6 max-w-5xl px-4 py-8">
      <div className="text-center mb-8">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500 ring-8 ring-emerald-500/5 mb-3">
          <BatteryCharging className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Đăng nhập BatterySwap</h1>
        <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">Hệ thống quản lý quy trình thay pin ô tô điện thông minh</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-12 items-start">
        {/* Quick Login Section (Left/Top) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 via-slate-50/50 to-transparent p-6 dark:border-emerald-500/10 dark:from-emerald-500/10 dark:to-slate-900/50">
            <div className="flex items-center justify-between mb-4 border-b border-slate-200/80 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-emerald-500" />
                <h2 className="text-lg font-black text-slate-900 dark:text-white">Đăng nhập nhanh theo vai trò</h2>
              </div>
              <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">1-Click Test Flow</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Chọn vai trò bên dưới để đăng nhập ngay vào hệ thống thử nghiệm với dữ liệu mẫu (Mật khẩu mặc định: <code className="font-mono font-bold text-emerald-600 dark:text-emerald-400">123456</code>).
            </p>

            <div className="grid gap-3">
              {DEMO_ACCOUNTS.map((acc) => {
                const IconComponent = acc.icon;
                const isCurrentBusy = quickLoadingEmail === acc.email;
                return (
                  <button
                    key={acc.email}
                    disabled={!!quickLoadingEmail || loading}
                    onClick={() => void handleQuickLogin(acc)}
                    className="group relative flex items-center justify-between rounded-xl border border-slate-200/80 bg-white p-3.5 text-left transition-all hover:border-emerald-500 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-emerald-500/50"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition-colors group-hover:bg-emerald-500 group-hover:text-white dark:bg-slate-800 dark:text-slate-300">
                        {isCurrentBusy ? <Loader2 className="h-5 w-5 animate-spin text-emerald-500" /> : <IconComponent className="h-5 w-5" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-extrabold text-sm text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                            {acc.title}
                          </p>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{acc.desc}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="hidden sm:inline font-mono text-[11px] font-semibold text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300">
                        {acc.email}
                      </span>
                      <ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-emerald-500" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Standard Login Form (Right) */}
        <div className="lg:col-span-5">
          <div className="app-panel p-6 sm:p-8 space-y-6">
            <h2 className="text-lg font-black text-slate-900 dark:text-white">Đăng nhập tài khoản</h2>

            {GOOGLE_LOGIN_CONFIGURED && (
              <>
                <div className="flex justify-center">
                  <GoogleLoginButton disabled={googleLoading || loading || !!quickLoadingEmail} onCredential={(idToken) => void loginWithGoogle(idToken)} />
                </div>

                <div className="flex items-center gap-3 text-xs font-semibold uppercase text-slate-400">
                  <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                  <span>Hoặc dùng Email</span>
                  <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                </div>
              </>
            )}

            <form onSubmit={submit} className="space-y-4" aria-label="Đăng nhập">
              <Input label="Email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
              <div>
                <Input label="Mật khẩu" type="password" autoComplete="current-password" placeholder="••••••••" value={password} onChange={(event) => setPassword(event.target.value)} required />
                <div className="mt-1.5 text-right">
                  <Link to="/account-recovery" className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">
                    Quên mật khẩu?
                  </Link>
                </div>
              </div>

              {error && (
                <div role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs font-bold text-rose-600 dark:text-rose-400">
                  {error}
                </div>
              )}

              <Button type="submit" loading={loading} disabled={googleLoading || !!quickLoadingEmail} className="w-full">
                Đăng nhập
              </Button>
            </form>

            <p className="text-center text-sm text-slate-500 dark:text-slate-400">
              Chưa có tài khoản?{' '}
              <Link className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline" to="/register">
                Đăng ký ngay
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
