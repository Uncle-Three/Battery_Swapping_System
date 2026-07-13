import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { BatteryCharging } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { roleDashboard } from '../../../constants/routes';
import { useAuth } from '../../../hooks/useAuth';
import { authService } from '../../../services/authService';
import { getApiErrorMessage } from '../../../services/apiClient';

export const Login = () => {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false); const [error, setError] = useState('');
  const { login, isAuthenticated, user } = useAuth(); const navigate = useNavigate(); const location = useLocation();
  if (isAuthenticated && user) return <Navigate to={roleDashboard(user.role)} replace />;
  const submit = async (event: FormEvent) => { event.preventDefault(); setLoading(true); setError(''); try { const data = await authService.login({ email, password }); login(data.accessToken, data.user); const requested = (location.state as { from?: string } | null)?.from; navigate(requested && requested !== '/login' ? requested : roleDashboard(data.user.role), { replace: true }); } catch (cause) { setError(getApiErrorMessage(cause, 'Không thể đăng nhập.')); } finally { setLoading(false); } };
  return <div className="mx-auto flex min-h-[70vh] max-w-md items-center"><div className="w-full space-y-6 rounded-2xl border bg-white p-8 shadow-xl dark:bg-slate-900"><div className="text-center"><BatteryCharging className="mx-auto h-10 w-10 text-green-600" /><h1 className="mt-3 text-2xl font-black">Đăng nhập BatterySwap</h1><p className="mt-1 text-sm text-slate-500">Quản lý quy trình thay pin ô tô điện</p></div><form onSubmit={submit} className="space-y-4" aria-label="Đăng nhập"><Input label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /><Input label="Mật khẩu" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />{error && <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}<Button type="submit" loading={loading} className="w-full">Đăng nhập</Button></form><p className="text-center text-sm">Chưa có tài khoản? <Link className="font-semibold text-green-600" to="/register">Đăng ký</Link></p></div></div>;
};
export default Login;
