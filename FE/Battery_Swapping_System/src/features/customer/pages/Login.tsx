import { useState, type FC, type FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BatteryCharging } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { UserRole } from '../../../constants/roles';
import { useAuth } from '../../../hooks/useAuth';
import { authService } from '../../../services/authService';

export const Login: FC = () => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('member@batteryswap.local');
  const [password, setPassword] = useState('123456');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'register') {
        await authService.register({
          email,
          password,
          name,
          ...(phone.trim() ? { phone: phone.trim() } : {}),
        });
      }

      const data = await authService.login({ email, password });
      login(data.accessToken, data.user);

      if (data.user.role === UserRole.MEMBER) {
        navigate(from, { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch {
      setError(mode === 'register' ? 'Khong the dang ky tai khoan.' : 'Email hoac mat khau khong dung.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 p-8 rounded-2xl shadow-xl max-w-md w-full text-left flex flex-col gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="p-3 bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-500 rounded-2xl">
            <BatteryCharging className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">
            {mode === 'login' ? 'Đăng nhập hệ thống' : 'Đăng ký tài khoản'}
          </h2>
          <p className="text-sm text-slate-550">
            {mode === 'login' ? 'Sử dụng tài khoản đã có' : 'Tạo tài khoản thành viên mới'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === 'register' && (
            <>
              <Input label="Họ tên" value={name} onChange={(e) => setName(e.target.value)} required />
              <Input label="Số điện thoại" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </>
          )}

          <Input
            label="Địa chỉ Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Input
            label="Mật khẩu"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && <p className="text-sm font-medium text-red-600">{error}</p>}

          <Button type="submit" loading={loading} className="w-full mt-2">
            {mode === 'login' ? 'Đăng nhập' : 'Đăng ký và đăng nhập'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login');
              setError('');
            }}
            className="w-full"
          >
            {mode === 'login' ? 'Tạo tài khoản mới' : 'Đã có tài khoản'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Login;
