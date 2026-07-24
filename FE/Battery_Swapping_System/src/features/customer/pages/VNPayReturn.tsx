import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle, AlertCircle, ShieldAlert, ArrowLeft } from 'lucide-react';
import { paymentService } from '../../../services/paymentService';
import { getApiErrorMessage } from '../../../services/apiClient';
import { LoadingSpinner } from '../../../components/feedback/LoadingSpinner';
import { Button } from '../../../components/ui/Button';
import { useAuth } from '../../../hooks/useAuth';
import { UserRole } from '../../../constants/roles';

type ReturnResult = {
  success: boolean;
  txnRef: string;
  amount: number;
  message: string;
  responseCode: string;
  signatureValid?: boolean;
  bookingId?: string | null;
  swapId?: string | null;
  swapStatus?: string | null;
};

// Mã VNPay => ý nghĩa tiếng Việt
const RESPONSE_LABELS: Record<string, string> = {
  '00': 'Giao dịch thành công',
  '07': 'Trừ tiền thành công. Giao dịch bị nghi ngờ (liên quan tới lừa đảo, giao dịch bất thường)',
  '09': 'Thẻ/Tài khoản của khách hàng chưa đăng ký dịch vụ InternetBanking',
  '10': 'Khách hàng xác thực thông tin thẻ/tài khoản không đúng quá 3 lần',
  '11': 'Đã hết hạn chờ thanh toán. Xin quý khách vui lòng thực hiện lại giao dịch',
  '12': 'Thẻ/Tài khoản của khách hàng bị khóa',
  '13': 'Quý khách nhập sai mật khẩu OTP',
  '24': 'Khách hàng hủy giao dịch',
  '51': 'Tài khoản của quý khách không đủ số dư để thực hiện giao dịch',
  '65': 'Tài khoản của quý khách đã vượt quá hạn mức giao dịch trong ngày',
  '75': 'Ngân hàng thanh toán đang bảo trì',
  '79': 'KH nhập sai mật khẩu thanh toán quá số lần quy định',
  '99': 'Lỗi không xác định',
};

const CANCEL_CODE = '24';

export const VNPayReturn = () => {
  const [searchParams] = useSearchParams();
  const [result, setResult] = useState<ReturnResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const params: Record<string, string> = {};
    searchParams.forEach((value, key) => { params[key] = value; });

    // Không có params VNPay — hiển thị trang không có kết quả ngay, không gọi API
    if (!params['vnp_ResponseCode']) {
      setResult({
        success: false,
        txnRef: '',
        amount: 0,
        message: 'Không có thông tin phản hồi từ VNPay.',
        responseCode: 'MISSING',
        signatureValid: false,
      });
      return;
    }

    setLoading(true);
    paymentService.getVNPayReturn(params)
      .then(setResult)
      .catch((cause) => setFetchError(getApiErrorMessage(cause)))
      .finally(() => setLoading(false));
  }, [searchParams]);

  useEffect(() => {
    const isStationOperator =
      user?.role === UserRole.STAFF || user?.role === UserRole.TECHNICIAN;
    if (result?.swapId && result.signatureValid && isStationOperator) {
      navigate(`/staff/swaps/${result.swapId}`, { replace: true });
    }
  }, [navigate, result, user?.role]);

  if (loading) return <LoadingSpinner size="lg" label="Đang xác nhận kết quả thanh toán..." />;

  const isCancelled = result?.responseCode === CANCEL_CODE;
  const isInvalidSig = result && !result.signatureValid && result.responseCode !== 'MISSING';
  const responseLabel = result ? (RESPONSE_LABELS[result.responseCode] ?? result.message) : '';

  return (
    <div className="mx-auto max-w-lg space-y-6 py-10 text-center">

      {/* Lỗi fetch API (hiếm gặp) */}
      {fetchError && !result && (
        <div className="flex flex-col items-center gap-3">
          <AlertCircle className="h-16 w-16 text-red-400" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Lỗi kết nối</h1>
          <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{fetchError}</p>
        </div>
      )}

      {/* Thành công */}
      {result?.success && (
        <div className="flex flex-col items-center gap-4">
          <div className="rounded-full bg-green-100 p-5">
            <CheckCircle2 className="h-16 w-16 text-green-600" />
          </div>
          <h1 className="text-3xl font-black text-green-700 dark:text-green-400">Thanh toán thành công!</h1>
          <div className="w-full rounded-2xl border border-green-200 bg-white p-6 text-left shadow-sm dark:border-green-900 dark:bg-slate-900">
            <div className="space-y-3 text-sm">
              <Row label="Mã giao dịch" value={<span className="font-mono font-semibold">{result.txnRef}</span>} />
              <Row label="Số tiền" value={<span className="font-bold text-green-700">{result.amount.toLocaleString('vi-VN')} VND</span>} />
              <Row label="Kết quả" value={<span className="font-semibold text-green-700">{responseLabel}</span>} />
            </div>
          </div>
          <p className="text-sm text-slate-500">
            Giao dịch đã được máy chủ xác minh và trạng thái thay pin đã được cập nhật.
          </p>
        </div>
      )}

      {/* Chữ ký không hợp lệ */}
      {result && !result.success && isInvalidSig && (
        <div className="flex flex-col items-center gap-4">
          <div className="rounded-full bg-orange-100 p-5">
            <ShieldAlert className="h-16 w-16 text-orange-600" />
          </div>
          <h1 className="text-3xl font-black text-slate-800 dark:text-white">Chữ ký không hợp lệ</h1>
          <p className="rounded-xl bg-orange-50 p-4 text-sm text-orange-800">
            Không thể xác nhận tính hợp lệ của giao dịch này. Vui lòng mở lại booking hoặc liên hệ hỗ trợ nếu tài khoản ngân hàng đã bị trừ tiền.
          </p>
          <Row label="Mã giao dịch" value={<span className="font-mono">{result.txnRef || '—'}</span>} />
        </div>
      )}

      {/* Hủy hoặc thất bại (chữ ký hợp lệ) */}
      {result && !result.success && !isInvalidSig && result.responseCode !== 'MISSING' && (
        <div className="flex flex-col items-center gap-4">
          <div className={`rounded-full p-5 ${isCancelled ? 'bg-yellow-100' : 'bg-red-100'}`}>
            {isCancelled
              ? <AlertCircle className="h-16 w-16 text-yellow-600" />
              : <XCircle className="h-16 w-16 text-red-600" />}
          </div>
          <h1 className="text-3xl font-black text-slate-800 dark:text-white">
            {isCancelled ? 'Đã hủy thanh toán' : 'Thanh toán thất bại'}
          </h1>
          <div className="w-full rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="space-y-3 text-sm">
              {result.txnRef && <Row label="Mã giao dịch" value={<span className="font-mono font-semibold">{result.txnRef}</span>} />}
              <Row label="Mã lỗi" value={<span className="font-mono text-red-600">{result.responseCode}</span>} />
              <Row label="Nguyên nhân" value={<span className="font-semibold">{responseLabel}</span>} />
            </div>
          </div>
          <p className="text-sm text-slate-500">
            {isCancelled
              ? 'Bạn đã hủy giao dịch. Không có khoản tiền nào bị trừ.'
              : 'Giao dịch không thành công. Không có khoản tiền nào bị trừ (trừ mã 07).'}
          </p>
        </div>
      )}

      {/* Không có thông tin VNPay (truy cập trực tiếp trang) */}
      {result?.responseCode === 'MISSING' && (
        <div className="flex flex-col items-center gap-4">
          <AlertCircle className="h-16 w-16 text-slate-400" />
          <h1 className="text-2xl font-bold text-slate-700 dark:text-slate-300">Không có kết quả thanh toán</h1>
          <p className="text-sm text-slate-500">
            Trang này chỉ hiển thị kết quả sau khi bạn thanh toán qua VNPay.
          </p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-center gap-3 pt-2">
        <Link to="/app/dashboard">
          <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" />Trang tổng quan</Button>
        </Link>
        <Link to={result?.swapId && (user?.role === UserRole.STAFF || user?.role === UserRole.TECHNICIAN)
          ? `/staff/swaps/${result.swapId}`
          : result?.bookingId
            ? `/app/bookings/${result.bookingId}`
            : '/app/bookings'}>
          <Button variant="primary">
            {result?.swapId && (user?.role === UserRole.STAFF || user?.role === UserRole.TECHNICIAN)
              ? 'Xem quy trình đổi pin'
              : result?.bookingId
                ? 'Xem lịch thay pin'
                : 'Xem danh sách lịch'}
          </Button>
        </Link>
      </div>
    </div>
  );
};

// Helper component
const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex items-center justify-between gap-4">
    <span className="text-slate-500 shrink-0">{label}</span>
    <span className="text-right">{value}</span>
  </div>
);

export default VNPayReturn;
