import { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CreditCard, CheckCircle2, XCircle, Clock, ArrowLeft, ExternalLink, ShieldCheck } from 'lucide-react';
import { paymentService } from '../../../services/paymentService';
import { getApiErrorMessage } from '../../../services/apiClient';
import { LoadingSpinner } from '../../../components/feedback/LoadingSpinner';
import { Button } from '../../../components/ui/Button';
import type { BookingPaymentStatus } from '../../../types';
import { statusLabel } from '../../../utils/viLabels';

const METHOD_LABELS: Record<string, string> = {
  VNPAY: 'VNPay',
  CASH: 'Tiền mặt',
};

const statusColor: Record<string, string> = {
  SUCCESS: 'text-green-600',
  FAILED: 'text-red-600',
  PENDING: 'text-yellow-600',
};

const invoiceStatusBadge = (status: string) => {
  if (status === 'PAID') return <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-800">Đã thanh toán</span>;
  return <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-bold text-yellow-800">Chưa thanh toán</span>;
};

export const PaymentBooking = () => {
  const { bookingId = '' } = useParams();
  const [data, setData] = useState<BookingPaymentStatus | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [payError, setPayError] = useState('');

  const load = useCallback(() => {
    setError('');
    return paymentService.getBookingPaymentStatus(bookingId)
      .then(setData)
      .catch((cause) => setError(getApiErrorMessage(cause)));
  }, [bookingId]);

  useEffect(() => { void load(); }, [load]);

  const handleVNPay = async () => {
    setBusy(true);
    setPayError('');
    try {
      const result = await paymentService.initiateVNPayBookingPayment(bookingId);
      window.location.assign(result.paymentUrl);
    } catch (cause) {
      setPayError(getApiErrorMessage(cause));
      setBusy(false);
    }
  };

  if (!data && !error) return <LoadingSpinner size="lg" label="Đang tải thông tin thanh toán..." />;
  if (error && !data) return (
    <div className="mx-auto max-w-2xl space-y-4">
      <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p>
      <Link to="/app/bookings"><Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" />Quay lại danh sách</Button></Link>
    </div>
  );

  const { booking, swap } = data!;
  const invoice = swap?.invoice;
  const amount = invoice?.amount ?? booking.costEstimate;
  const amountLabel = amount === undefined ? 'Chưa có dữ liệu' : `${amount.toLocaleString('vi-VN')} VND`;
  const isPaid = invoice?.status === 'PAID';

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-4 text-left">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-green-50 p-2 text-green-600">
          <CreditCard className="h-7 w-7" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Thanh toán đổi pin</h1>
          <p className="text-sm text-slate-500">Mã lịch thay pin: <span className="font-mono font-semibold">{bookingId}</span></p>
        </div>
      </div>

      {/* Payment errors */}
      {payError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-red-700">{payError}</p>}

      {/* Invoice card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Hóa đơn dịch vụ</h2>
          {invoice ? invoiceStatusBadge(invoice.status) : (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">Chưa có hóa đơn</span>
          )}
        </div>

        {/* Amount — server-calculated, not FE-controlled */}
        <div className="rounded-xl bg-gradient-to-br from-green-600 to-emerald-600 p-6 text-white">
          <p className="text-sm opacity-80">Số tiền cần thanh toán</p>
          <p className="mt-1 text-4xl font-black">{amountLabel}</p>
          {invoice && (
            <p className="mt-2 text-xs opacity-70">
              Phương thức: {METHOD_LABELS[invoice.paymentMethod] ?? invoice.paymentMethod}
            </p>
          )}
        </div>

        {/* Payment history */}
        {swap?.payments && swap.payments.length > 0 && (
          <div className="mt-4 space-y-2">
            <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400">Lịch sử giao dịch</h3>
            {swap.payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
                <div>
                  <span className="text-sm font-medium">{METHOD_LABELS[p.paymentMethod] ?? p.paymentMethod}</span>
                  <span className="ml-2 text-xs text-slate-500">{new Date(p.createdAt).toLocaleString('vi-VN')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{p.amount.toLocaleString('vi-VN')} VND</span>
                  <span className={`text-xs font-bold ${statusColor[p.status] ?? 'text-slate-500'}`}>{statusLabel(p.status)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900 dark:bg-emerald-950/20">
        <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-700" /><div><p className="font-bold text-emerald-900 dark:text-emerald-200">Thanh toán trực tiếp theo lịch thay pin</p><p className="mt-1 text-sm text-emerald-800 dark:text-emerald-300">Bạn thanh toán chính xác số tiền trên hóa đơn qua VNPay. Hệ thống không sử dụng số dư ví và không yêu cầu nạp tiền trước.</p></div></div>
      </div>

      {/* Actions */}
      {!swap && (
        <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
          <Clock className="h-5 w-5 text-slate-400" />
          <p className="text-slate-600 dark:text-slate-400">Chưa có quy trình thay pin nào được xử lý cho lịch này.</p>
        </div>
      )}

      {swap && isPaid && (
        <div className="flex items-center gap-3 rounded-xl bg-green-50 p-4 dark:bg-green-950/30">
          <CheckCircle2 className="h-6 w-6 text-green-600" />
          <div>
            <p className="font-bold text-green-800 dark:text-green-300">Đã thanh toán thành công</p>
            <p className="text-sm text-green-700 dark:text-green-400">
              {invoice && `${(invoice.amount).toLocaleString('vi-VN')} VND — ${METHOD_LABELS[invoice.paymentMethod] ?? invoice.paymentMethod}`}
            </p>
          </div>
        </div>
      )}

      {swap && !isPaid && invoice && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-4 font-bold text-slate-900 dark:text-white">Tiến hành thanh toán</h2>
          <div className="space-y-3">
            <button
              id="btn-pay-vnpay"
              onClick={() => void handleVNPay()}
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 font-bold text-white transition hover:bg-red-700 disabled:opacity-60"
            >
              {busy ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <ExternalLink className="h-4 w-4" />}
              Thanh toán qua VNPay
            </button>
            <p className="text-xs text-slate-500 text-center">
              Số tiền {invoice.amount.toLocaleString('vi-VN')} VND được tính từ hóa đơn máy chủ — không thể thay đổi từ phía người dùng.
            </p>
          </div>
        </div>
      )}

      {swap && !isPaid && !invoice && (
        <div className="flex items-center gap-3 rounded-xl bg-yellow-50 p-4 dark:bg-yellow-950/20">
          <XCircle className="h-5 w-5 text-yellow-600" />
          <p className="text-yellow-800 dark:text-yellow-300">Quy trình thay pin chưa hoàn tất nên chưa có hóa đơn để thanh toán.</p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3">
        <Link to="/app/bookings">
          <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" />Danh sách đặt lịch</Button>
        </Link>
        <Link to={`/app/bookings/${bookingId}`}>
          <Button variant="outline">Chi tiết booking</Button>
        </Link>
      </div>
    </div>
  );
};

export default PaymentBooking;
