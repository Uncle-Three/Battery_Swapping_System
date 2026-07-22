import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { CheckCircle2, LoaderCircle, MailCheck, XCircle } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { authService } from '../../../services/authService';
import { getApiErrorMessage } from '../../../services/apiClient';

type VerifyState = 'waiting' | 'verifying' | 'verified' | 'error';

export const VerifyEmail = () => {
  const [params] = useSearchParams();
  const location = useLocation();
  const token = params.get('token')?.trim() ?? '';
  const [email, setEmail] = useState(params.get('email') ?? '');
  const [status, setStatus] = useState<VerifyState>(token ? 'verifying' : 'waiting');
  const [message, setMessage] = useState('');
  const [resending, setResending] = useState(false);
  const verificationRequest = useRef<{
    token: string;
    promise: ReturnType<typeof authService.verifyEmail>;
  } | null>(null);
  const emailSent = (location.state as { emailSent?: boolean } | null)?.emailSent;

  useEffect(() => {
    if (!token) return;
    let active = true;

    setStatus('verifying');
    setMessage('');
    if (verificationRequest.current?.token !== token) {
      verificationRequest.current = {
        token,
        promise: authService.verifyEmail(token),
      };
    }

    verificationRequest.current.promise
      .then(() => {
        if (!active) return;
        setStatus('verified');
        setMessage('Email đã được xác minh. Bạn có thể đăng nhập ngay.');
      })
      .catch((error: unknown) => {
        if (!active) return;
        setStatus('error');
        setMessage(getApiErrorMessage(error, 'Liên kết xác minh không hợp lệ hoặc đã hết hạn.'));
      });

    return () => {
      active = false;
    };
  }, [token]);

  const resend = async (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim()) {
      setStatus('error');
      setMessage('Vui lòng nhập email trước khi gửi lại liên kết.');
      return;
    }
    setResending(true);
    setMessage('');
    try {
      await authService.resendVerification(email.trim());
      setStatus('waiting');
      setMessage('Liên kết xác minh mới đã được gửi. Liên kết cũ không còn hiệu lực.');
    } catch (error) {
      setStatus('error');
      setMessage(getApiErrorMessage(error, 'Không thể gửi lại liên kết xác minh.'));
    } finally {
      setResending(false);
    }
  };

  const description = status === 'verifying'
    ? 'Đang xác minh email từ liên kết của bạn...'
    : status === 'verified'
      ? message
      : token
        ? message
        : emailSent === false
          ? 'Máy chủ chưa gửi được email. Kiểm tra cấu hình Gmail SMTP rồi thử gửi lại.'
          : `Một liên kết xác minh đã được gửi tới ${email || 'email của bạn'}. Hãy mở email và bấm vào liên kết để kích hoạt tài khoản.`;

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <div className="space-y-5 rounded-2xl border bg-white p-8 text-center shadow-lg dark:bg-slate-900">
        {status === 'verified'
          ? <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" />
          : status === 'error'
            ? <XCircle className="mx-auto h-14 w-14 text-rose-500" />
            : status === 'verifying'
              ? <LoaderCircle className="mx-auto h-14 w-14 animate-spin text-emerald-500" />
              : <MailCheck className="mx-auto h-14 w-14 text-emerald-500" />}

        <div>
          <h1 className="text-2xl font-black">Xác minh email</h1>
          <p className="mt-2 text-sm text-slate-500">{description}</p>
        </div>

        {status !== 'verified' && status !== 'verifying' && (
          <form onSubmit={resend} className="space-y-4 text-left">
            <Input label="Email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            <Button type="submit" variant="outline" loading={resending} className="w-full">Gửi lại liên kết xác minh</Button>
          </form>
        )}

        {message && status !== 'verified' && status !== 'verifying' && (
          <div role="status" className="rounded-lg bg-slate-100 p-3 text-sm dark:bg-slate-800">{message}</div>
        )}
        <Link className="inline-block text-sm font-bold text-emerald-600 hover:underline" to="/login">Quay lại đăng nhập</Link>
      </div>
    </div>
  );
};

export default VerifyEmail;
