import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle, ShieldCheck, Loader2 } from 'lucide-react';

export const MockVNPayPage = () => {
  const [searchParams] = useSearchParams();
  const txnRef = searchParams.get('vnp_TxnRef') || '';
  const amountRaw = searchParams.get('vnp_Amount') || '4500000';
  const orderInfo = searchParams.get('vnp_OrderInfo') || 'Thanh toán dịch vụ thay pin';
  const secureHash = searchParams.get('vnp_SecureHash') || '';

  const amountVND = parseInt(amountRaw, 10) / 100;
  const [loading, setLoading] = useState(false);

  const completePayment = async (responseCode: string) => {
    setLoading(true);
    try {
      const backendUrl = 'http://localhost:5000/api/v1';

      // 1. Gọi IPN server-to-server để cập nhật trạng thái DB sang COMPLETED & PAID
      const ipnParams = new URLSearchParams({
        vnp_TxnRef: txnRef,
        vnp_Amount: amountRaw,
        vnp_ResponseCode: responseCode,
        vnp_TransactionStatus: responseCode,
        vnp_SecureHash: secureHash,
      });

      await fetch(`${backendUrl}/payments/vnpay/ipn?${ipnParams.toString()}`);

      // 2. Chuyển hướng về Return URL phía Frontend
      const returnParams = new URLSearchParams({
        vnp_TxnRef: txnRef,
        vnp_Amount: amountRaw,
        vnp_ResponseCode: responseCode,
        vnp_TransactionStatus: responseCode,
        vnp_SecureHash: secureHash,
      });

      window.location.href = `http://localhost:5173/payments/vnpay/return?${returnParams.toString()}`;
    } catch {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto my-12 max-w-lg px-4">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        {/* Header VNPay Mock */}
        <div className="text-center pb-6 border-b border-slate-200/80 dark:border-slate-800">
          <div className="inline-flex items-center gap-2 rounded-2xl bg-blue-500/10 px-4 py-2 text-blue-600 dark:text-blue-400 font-extrabold text-sm mb-2">
            <ShieldCheck className="h-5 w-5" />
            <span>VNPay Gateway Simulation</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">CỔNG THANH TOÁN VNPAY (TEST)</h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Môi trường giả lập thử nghiệm thanh toán đơn hàng</p>
        </div>

        {/* Thông tin đơn hàng */}
        <div className="my-6 space-y-3 rounded-2xl bg-slate-50 p-5 dark:bg-slate-800/50">
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-500 dark:text-slate-400">Mã giao dịch:</span>
            <span className="font-mono font-bold text-slate-900 dark:text-white">{txnRef || 'N/A'}</span>
          </div>
          <div className="flex justify-between items-center text-sm border-t border-slate-200/60 pt-2 dark:border-slate-700/60">
            <span className="text-slate-500 dark:text-slate-400">Mô tả:</span>
            <span className="font-medium text-slate-900 dark:text-white text-right max-w-60 truncate">{orderInfo}</span>
          </div>
          <div className="flex justify-between items-center text-sm border-t border-slate-200/60 pt-2 dark:border-slate-700/60">
            <span className="text-slate-500 dark:text-slate-400 font-bold">Số tiền thanh toán:</span>
            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">{amountVND.toLocaleString('vi-VN')} VND</span>
          </div>
        </div>

        {/* Nút bấm hành động thử nghiệm */}
        <div className="space-y-3">
          <button
            disabled={loading}
            onClick={() => void completePayment('00')}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
            <span>Xác nhận thanh toán thành công (Mã 00)</span>
          </button>

          <button
            disabled={loading}
            onClick={() => void completePayment('24')}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-6 py-3 text-sm font-bold text-rose-600 transition hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400 disabled:opacity-50"
          >
            <XCircle className="h-4 w-4" />
            <span>Hủy giao dịch / Thanh toán thất bại (Mã 24)</span>
          </button>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Chế độ thử nghiệm phát triển (Local Sandbox mode) · Tự động gửi IPN và phát hành thẻ bảo hành 1 năm.
        </p>
      </div>
    </div>
  );
};

export default MockVNPayPage;
