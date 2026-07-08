import { useState, type FC, type FormEvent } from 'react';
import { PaymentSummary } from '../components/PaymentSummary';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { CreditCard, Wallet, CheckCircle } from 'lucide-react';

export const Payment: FC = () => {
  const [amount, setAmount] = useState<number>(100000);
  const [paymentMethod, setPaymentMethod] = useState<'momo' | 'vnpay' | 'card'>('momo');
  const [showSummary, setShowSummary] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleRechargeInit = (e: FormEvent) => {
    e.preventDefault();
    if (amount <= 0) return;
    setShowSummary(true);
  };

  const handlePaymentConfirm = () => {
    console.log(`Recharged ${amount} via ${paymentMethod}`);
    setSuccess(true);
    setShowSummary(false);
  };

  return (
    <div className="max-w-xl mx-auto py-4 text-left">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-500 rounded-lg">
          <Wallet className="h-6 w-6" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Ví tài khoản & Nạp tiền
        </h1>
      </div>

      {success ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm flex flex-col gap-4 text-center items-center">
          <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-500" />
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Nạp tiền thành công!</h2>
            <p className="text-sm text-slate-500 mt-1">Số tiền {amount.toLocaleString()} VND đã được cộng vào tài khoản của bạn.</p>
          </div>
          <Button variant="primary" onClick={() => setSuccess(false)}>
            Nạp thêm tiền
          </Button>
        </div>
      ) : showSummary ? (
        <div className="flex justify-center">
          <PaymentSummary
            amount={amount}
            paymentMethod={paymentMethod}
            onConfirm={handlePaymentConfirm}
            onCancel={() => setShowSummary(false)}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Balance card */}
          <div className="bg-gradient-to-br from-green-650 to-green-700 text-white rounded-xl p-6 shadow-md flex justify-between items-center">
            <div>
              <span className="text-xs text-green-100 font-semibold uppercase tracking-wider">Số dư khả dụng</span>
              <h2 className="text-3xl font-black mt-1">150,000 VND</h2>
            </div>
            <div className="p-3 bg-white/10 rounded-lg">
              <CreditCard className="h-8 w-8" />
            </div>
          </div>

          {/* Recharge form */}
          <form onSubmit={handleRechargeInit} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm flex flex-col gap-4">
            <h3 className="font-bold text-lg text-slate-900 dark:text-white">Nạp tiền vào tài khoản</h3>
            
            <Input
              label="Số tiền cần nạp (VND)"
              type="number"
              min={10000}
              step={10000}
              value={amount}
              onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
              required
            />

            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Phương thức thanh toán</span>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('momo')}
                  className={`p-3 border rounded-lg flex flex-col items-center gap-1.5 transition-all text-xs font-semibold ${
                    paymentMethod === 'momo'
                      ? 'border-green-600 bg-green-50/50 text-green-800 dark:border-green-500 dark:bg-green-950/20 dark:text-green-300'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <span>MoMo Mock</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('vnpay')}
                  className={`p-3 border rounded-lg flex flex-col items-center gap-1.5 transition-all text-xs font-semibold ${
                    paymentMethod === 'vnpay'
                      ? 'border-green-600 bg-green-50/50 text-green-800 dark:border-green-500 dark:bg-green-950/20 dark:text-green-300'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <span>VNPay Mock</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`p-3 border rounded-lg flex flex-col items-center gap-1.5 transition-all text-xs font-semibold ${
                    paymentMethod === 'card'
                      ? 'border-green-600 bg-green-50/50 text-green-800 dark:border-green-500 dark:bg-green-950/20 dark:text-green-300'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <span>Thẻ ATM</span>
                </button>
              </div>
            </div>

            <Button type="submit" variant="primary" className="w-full mt-2">
              Tiếp tục
            </Button>
          </form>
        </div>
      )}
    </div>
  );
};
