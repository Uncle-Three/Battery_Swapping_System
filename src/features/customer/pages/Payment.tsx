import { useState, type FC, type FormEvent } from 'react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { LoadingSpinner } from '../../../components/feedback/LoadingSpinner';
import { Wallet, CreditCard, CheckCircle2, QrCode, Info, Award } from 'lucide-react';

export const Payment: FC = () => {
  const [balance, setBalance] = useState(150000);
  const [amount, setAmount] = useState<number>(100000);
  const [paymentMethod, setPaymentMethod] = useState<'momo' | 'vnpay' | 'card'>('momo');
  const [activeTab, setActiveTab] = useState<'wallet' | 'packages'>('wallet');

  // Modal triggers
  const [isOpenGateway, setIsOpenGateway] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Packages selection
  const packages = [
    { id: 'p-1', name: 'Gói Tiết Kiệm (Eco)', price: 150000, desc: 'Giới hạn 5 lượt đổi pin/tháng. Phù hợp cho nhu cầu di chuyển ít.', limits: '5 lượt/tháng' },
    { id: 'p-2', name: 'Gói Vô Cực (Unlimited)', price: 350000, desc: 'Đổi pin không giới hạn lượt. Tối ưu hoàn toàn cho tài xế công nghệ, giao hàng.', limits: 'Không giới hạn' },
  ];

  const handleRechargeInit = (e: FormEvent) => {
    e.preventDefault();
    if (amount < 10000) return;
    
    setIsOpenGateway(true);
    setProcessing(true);
    
    // Simulate payment process
    setTimeout(() => {
      setProcessing(false);
    }, 1500);
  };

  const handleMockPayConfirm = () => {
    setProcessing(true);
    setTimeout(() => {
      setBalance(balance + amount);
      setSuccessMsg(`Bạn đã nạp thành công ${amount.toLocaleString()} VND vào ví tài khoản.`);
      setSuccess(true);
      setProcessing(false);
      setIsOpenGateway(false);
    }, 1200);
  };

  const handleBuyPackage = (pkg: typeof packages[0]) => {
    if (balance < pkg.price) {
      alert('Số dư ví không đủ. Vui lòng nạp thêm tiền vào ví!');
      return;
    }
    
    setProcessing(true);
    setTimeout(() => {
      setBalance(balance - pkg.price);
      setSuccessMsg(`Đăng ký thành công ${pkg.name}. Phí cước dịch vụ đã được thanh toán từ tài khoản ví.`);
      setSuccess(true);
      setProcessing(false);
    }, 800);
  };

  return (
    <div className="max-w-4xl mx-auto py-4 text-left">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-500 rounded-lg">
          <Wallet className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Ví tài khoản & Gói thuê pin
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Quản lý nguồn quỹ thanh toán và gói cước đổi pin</p>
        </div>
      </div>

      {success && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/30 rounded-xl flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-3 text-green-800 dark:text-green-300 text-sm font-semibold">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <span>{successMsg}</span>
          </div>
          <Button size="sm" onClick={() => setSuccess(false)}>Đóng</Button>
        </div>
      )}

      {/* Grid containing wallet state and panels */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Wallet Balance Card */}
        <div className="flex flex-col gap-6 md:col-span-1">
          <div className="bg-gradient-to-br from-green-600 to-emerald-600 text-white rounded-2xl p-6 shadow-lg flex flex-col justify-between h-48 relative overflow-hidden">
            <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-4 translate-y-4">
              <Wallet className="h-40 w-40" />
            </div>
            <div>
              <span className="text-xs text-green-100 font-bold uppercase tracking-wider">Số dư khả dụng</span>
              <h2 className="text-3xl font-black mt-1.5">{balance.toLocaleString()} VND</h2>
            </div>
            <div className="flex justify-between items-center mt-6">
              <span className="text-xs bg-white/20 px-2.5 py-1 rounded-md font-semibold">RFID Verified</span>
              <CreditCard className="h-6 w-6 text-green-100" />
            </div>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-start gap-2.5">
            <Info className="h-5 w-5 text-slate-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-slate-550 dark:text-slate-400">
              Phí đổi pin đơn lẻ tiêu chuẩn là <strong>45,000 VND / lần đổi</strong> nếu bạn không đăng ký gói cước trả trước.
            </p>
          </div>
        </div>

        {/* Action tabs details */}
        <div className="md:col-span-2 flex flex-col gap-6">
          {/* Tab selector */}
          <div className="flex border-b border-slate-200 dark:border-slate-850">
            <button
              onClick={() => setActiveTab('wallet')}
              className={`pb-3 text-sm font-semibold border-b-2 transition-all px-4 ${
                activeTab === 'wallet'
                  ? 'border-green-600 text-green-600 dark:border-green-500 dark:text-green-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Nạp tiền ví tài khoản
            </button>
            <button
              onClick={() => setActiveTab('packages')}
              className={`pb-3 text-sm font-semibold border-b-2 transition-all px-4 ${
                activeTab === 'packages'
                  ? 'border-green-600 text-green-600 dark:border-green-500 dark:text-green-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Đăng ký Gói thuê pin
            </button>
          </div>

          {activeTab === 'wallet' && (
            <form onSubmit={handleRechargeInit} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
              <h3 className="font-bold text-base text-slate-850 dark:text-white">Nạp tiền vào ví</h3>
              
              <Input
                label="Số tiền muốn nạp (VND)"
                type="number"
                min={20000}
                step={10000}
                value={amount}
                onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
                required
              />

              <div className="flex flex-col gap-2 mt-2">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Phương thức thanh toán</span>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('momo')}
                    className={`p-3 border rounded-xl flex flex-col items-center gap-1.5 transition-all text-xs font-semibold ${
                      paymentMethod === 'momo'
                        ? 'border-green-600 bg-green-50/50 text-green-800 dark:border-green-500 dark:bg-green-950/20 dark:text-green-300'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-305'
                    }`}
                  >
                    <span>Ví MoMo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('vnpay')}
                    className={`p-3 border rounded-xl flex flex-col items-center gap-1.5 transition-all text-xs font-semibold ${
                      paymentMethod === 'vnpay'
                        ? 'border-green-600 bg-green-50/50 text-green-800 dark:border-green-500 dark:bg-green-950/20 dark:text-green-300'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-305'
                    }`}
                  >
                    <span>Cổng VNPay</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`p-3 border rounded-xl flex flex-col items-center gap-1.5 transition-all text-xs font-semibold ${
                      paymentMethod === 'card'
                        ? 'border-green-600 bg-green-50/50 text-green-800 dark:border-green-500 dark:bg-green-950/20 dark:text-green-300'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-305'
                    }`}
                  >
                    <span>Thẻ Visa / ATM</span>
                  </button>
                </div>
              </div>

              <Button type="submit" variant="primary" className="w-full mt-4">
                Khởi tạo giao dịch nạp ví
              </Button>
            </form>
          )}

          {activeTab === 'packages' && (
            <div className="grid sm:grid-cols-2 gap-4">
              {packages.map((pkg) => (
                <div key={pkg.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl p-5 shadow-sm flex flex-col justify-between gap-5 hover:shadow-md transition-all">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-850 dark:text-slate-100">{pkg.name}</h4>
                      <Award className="h-5 w-5 text-green-600" />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{pkg.desc}</p>
                    <div className="text-xs font-semibold text-green-600 mt-1">Hạn mức: {pkg.limits}</div>
                  </div>
                  <div>
                    <div className="text-lg font-black text-slate-900 dark:text-white mb-3">
                      {pkg.price.toLocaleString()} VND <span className="text-xs text-slate-400 font-normal">/ tháng</span>
                    </div>
                    <Button variant="primary" className="w-full" onClick={() => handleBuyPackage(pkg)}>
                      Đăng ký gói
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mock Payment Gateway Modal */}
      <Modal
        isOpen={isOpenGateway}
        onClose={() => setIsOpenGateway(false)}
        title={paymentMethod === 'card' ? 'Nhập thông tin thẻ thanh toán' : 'Mô phỏng Cổng thanh toán'}
        footer={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsOpenGateway(false)}>
              Hủy
            </Button>
            {!processing && (
              <Button variant="primary" onClick={handleMockPayConfirm}>
                Xác nhận đã thanh toán
              </Button>
            )}
          </div>
        }
      >
        {processing ? (
          <div className="py-6 flex flex-col items-center">
            <LoadingSpinner size="md" label="Đang khởi tạo cổng thanh toán..." />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 text-center py-2 animate-fadeIn">
            {paymentMethod === 'card' ? (
              <div className="w-full flex flex-col gap-3 text-left">
                <Input label="Số thẻ tín dụng" placeholder="4123 4567 8901 2345" required />
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Hạn sử dụng" placeholder="MM/YY" required />
                  <Input label="Mã CVV" placeholder="123" type="password" required />
                </div>
              </div>
            ) : (
              <>
                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center border border-slate-100 dark:border-slate-800">
                  <QrCode className="h-44 w-44 text-slate-850 dark:text-slate-100" />
                </div>
                <div className="text-sm">
                  <p className="text-slate-655 dark:text-slate-350">
                    Quét mã QR trên để nạp <strong className="text-green-600">{amount.toLocaleString()} VND</strong> vào tài khoản ví qua ứng dụng di động.
                  </p>
                  <p className="text-xs text-slate-400 mt-2">
                    * Trong môi trường demo, vui lòng bấm nút "Xác nhận đã thanh toán" để cộng trực tiếp số dư ví.
                  </p>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
export default Payment;
