import { useCallback, useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { BatteryCharging } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { GoogleLoginButton } from '../../../components/auth/GoogleLoginButton';
import { roleDashboard } from '../../../constants/routes';
import { useAuth } from '../../../hooks/useAuth';
import { authService, type AuthResponse } from '../../../services/authService';
import { getApiErrorMessage } from '../../../services/apiClient';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const finishLogin = useCallback((data: AuthResponse) => {
    login(data.accessToken, data.user);
    const requested = (location.state as { from?: string } | null)?.from;
    navigate(requested && requested !== '/login' ? requested : roleDashboard(data.user.role), { replace: true });
  }, [location.state, login, navigate]);

  if (isAuthenticated && user) return <Navigate to={roleDashboard(user.role)} replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await authService.login({ email, password });
      finishLogin(data);
    } catch (cause) {
      setError(getApiErrorMessage(cause, 'Khong the dang nhap.'));
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = useCallback(async (idToken: string) => {
    setGoogleLoading(true);
    setError('');
    try {
      const data = await authService.googleLogin(idToken);
      finishLogin(data);
    } catch (cause) {
      setError(getApiErrorMessage(cause, 'Khong the dang nhap bang Google.'));
    } finally {
      setGoogleLoading(false);
    }
  }, [finishLogin]);

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md items-center">
      <div className="w-full space-y-6 rounded-2xl border bg-white p-8 shadow-xl dark:bg-slate-900">
        <div className="text-center">
          <BatteryCharging className="mx-auto h-10 w-10 text-green-600" />
          <h1 className="mt-3 text-2xl font-black">Dang nhap BatterySwap</h1>
          <p className="mt-1 text-sm text-slate-500">Quan ly quy trinh thay pin o to dien</p>
        </div>

        <div className="flex justify-center">
          <GoogleLoginButton disabled={googleLoading || loading} onCredential={(idToken) => void loginWithGoogle(idToken)} />
        </div>

        <div className="flex items-center gap-3 text-xs font-semibold uppercase text-slate-400">
          <span className="h-px flex-1 bg-slate-200" />
          <span>Hoac</span>
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        <form onSubmit={submit} className="space-y-4" aria-label="Dang nhap">
          <Input label="Email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          <Input label="Mat khau" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          {error && <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          <Button type="submit" loading={loading} disabled={googleLoading} className="w-full">Dang nhap</Button>
        </form>

        <p className="text-center text-sm">
          Chua co tai khoan? <Link className="font-semibold text-green-600" to="/register">Dang ky</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
