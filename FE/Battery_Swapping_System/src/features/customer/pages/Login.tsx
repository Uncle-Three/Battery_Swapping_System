import { useState, type FC, type FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Dropdown } from '../../../components/ui/Dropdown';
import { BatteryCharging } from 'lucide-react';
import { UserRole } from '../../../constants/roles';

export const Login: FC = () => {
  const [email, setEmail] = useState('tuananh@gmail.com');
  const [password, setPassword] = useState('123456');
  const [role, setRole] = useState<UserRole>(UserRole.MEMBER);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/';

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulate login via hook
    setTimeout(() => {
      login('mock-token', {
        id: 'u-1',
        email,
        name: email.split('@')[0],
        role,
        createdAt: new Date().toISOString(),
      });
      setLoading(false);
      
      // If role is MEMBER/GUEST, navigate to main home/stations. Else navigate to dashboard.
      if (role === UserRole.MEMBER || role === UserRole.GUEST) {
        navigate(from, { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }, 600);
  };

  const roleOptions = [
    { value: UserRole.MEMBER, label: 'Khách hàng (MEMBER)' },
    { value: UserRole.STAFF, label: 'Nhân viên trạm (STAFF)' },
    { value: UserRole.TECHNICIAN, label: 'Kỹ thuật viên (TECHNICIAN)' },
    { value: UserRole.MANAGER, label: 'Quản lý (MANAGER)' },
    { value: UserRole.ADMIN, label: 'Quản trị viên (ADMIN)' },
  ];

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 p-8 rounded-2xl shadow-xl max-w-md w-full text-left flex flex-col gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="p-3 bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-500 rounded-2xl">
            <BatteryCharging className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">Đăng nhập hệ thống</h2>
          <p className="text-sm text-slate-550">Mô phỏng đăng nhập các vai trò (roles)</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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

          <Dropdown
            label="Chọn vai trò đăng nhập (Mô phỏng)"
            options={roleOptions}
            selectedValue={role}
            onChange={(val) => setRole(val as UserRole)}
          />

          <Button type="submit" loading={loading} className="w-full mt-2">
            Đăng nhập
          </Button>
        </form>
      </div>
    </div>
  );
};
export default Login;
