import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { authService } from '../../../services/authService';
import { getApiErrorMessage } from '../../../services/apiClient';

export const Register = () => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const phoneError = phone && !phone.startsWith('0')
    ? 'Số điện thoại phải bắt đầu bằng số 0.'
    : '';

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (phoneError) {
      return;
    }
    if (password !== confirm) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }
    setLoading(true);
    try {
      const result = await authService.register({
        name,
        email,
        password,
        ...(phone.trim() ? { phone: phone.trim() } : {}),
      });
      navigate(`/verify-email?email=${encodeURIComponent(email)}`, {
        replace: true,
        state: { emailSent: result.emailSent },
      });
    } catch (cause) {
      setError(getApiErrorMessage(cause, 'Không thể đăng ký.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg py-8">
      <div className="space-y-5 rounded-2xl border bg-white p-8 shadow-lg dark:bg-slate-900">
        <div><h1 className="text-2xl font-black">Tạo tài khoản thành viên</h1><p className="text-sm text-slate-500">Dành cho chủ sở hữu ô tô điện.</p></div>
        <form onSubmit={submit} className="space-y-4" aria-label="Đăng ký">
          <Input label="Họ và tên" value={name} onChange={(event) => setName(event.target.value)} required />
          <Input
            label="Số điện thoại"
            type="tel"
            inputMode="numeric"
            maxLength={10}
            value={phone}
            onChange={(event) => setPhone(event.target.value.replace(/\D/g, '').slice(0, 10))}
            error={phoneError}
          />
          <Input label="Email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          <Input label="Mật khẩu" type="password" autoComplete="new-password" minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} required />
          <Input label="Xác nhận mật khẩu" type="password" autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} required />
          <div
            role="alert"
            aria-live="polite"
            className={error ? 'rounded-lg bg-red-50 p-3 text-sm text-red-700' : 'hidden'}
          >
            {error}
          </div>
          <Button type="submit" loading={loading} className="w-full">Đăng ký</Button>
        </form>
        <p className="text-center text-sm">Đã có tài khoản? <Link className="font-semibold text-green-600" to="/login">Đăng nhập</Link></p>
      </div>
    </div>
  );
};

export default Register;
