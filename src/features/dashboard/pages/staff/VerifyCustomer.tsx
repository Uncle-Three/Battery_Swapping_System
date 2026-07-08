import React, { useState } from 'react';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import { Badge } from '../../../../components/ui/Badge';
import { CheckCircle2, UserCheck, ShieldAlert } from 'lucide-react';

export const VerifyCustomer: React.FC = () => {
  const [rfid, setRfid] = useState('');
  const [plate, setPlate] = useState('');
  const [result, setResult] = useState<any>(null);
  const [searching, setSearching] = useState(false);

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rfid && !plate) return;
    
    setSearching(true);
    setTimeout(() => {
      setResult({
        user: {
          id: 'u-55',
          name: 'Nguyễn Văn Hùng',
          email: 'hung.nguyen@gmail.com',
          role: 'MEMBER',
          rfidCard: rfid || 'RFID-9921',
          licensePlate: plate || '29A-12345',
        },
        activeBooking: {
          id: 'bk-551',
          stationName: 'Trạm Sạc GreenCharge Quận 1',
          status: 'PENDING',
          expiryTime: new Date(Date.now() + 15 * 60000).toISOString(),
        },
        subscription: {
          status: 'ACTIVE',
          expiresAt: '2026-12-31',
          balance: 250000,
        },
      });
      setSearching(false);
    }, 600);
  };

  return (
    <div className="flex flex-col gap-6 text-left max-w-4xl">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
          Xác thực thông tin Khách hàng
        </h2>
        <p className="text-sm text-slate-550 dark:text-slate-400 mt-1">
          Nhập RFID thẻ thành viên hoặc biển số xe máy điện để tra cứu thông tin đặt trước và gói cước.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Verification Form */}
        <form onSubmit={handleVerify} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm flex flex-col gap-4 h-fit md:col-span-1">
          <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Tra cứu
          </h3>
          <Input
            label="Mã RFID thẻ"
            placeholder="Ví dụ: 12345678"
            value={rfid}
            onChange={(e) => setRfid(e.target.value)}
          />
          <div className="text-xs text-center text-slate-400 font-semibold">- HOẶC -</div>
          <Input
            label="Biển số xe"
            placeholder="Ví dụ: 29A-12345"
            value={plate}
            onChange={(e) => setPlate(e.target.value)}
          />
          <Button type="submit" loading={searching} className="w-full mt-2">
            Tìm kiếm
          </Button>
        </form>

        {/* Results display */}
        <div className="md:col-span-2">
          {result ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm flex flex-col gap-6">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-3 text-green-600 dark:text-green-500">
                  <CheckCircle2 className="h-6 w-6" />
                  <h3 className="font-bold text-lg">Thông tin thành viên hợp lệ</h3>
                </div>
                <Badge variant="success">Active Plan</Badge>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-500">Tên khách hàng:</span>
                  <p className="font-bold text-slate-850 dark:text-slate-100">{result.user.name}</p>
                </div>
                <div>
                  <span className="text-slate-550">Email:</span>
                  <p className="font-medium text-slate-800 dark:text-slate-200">{result.user.email}</p>
                </div>
                <div>
                  <span className="text-slate-500">Thẻ RFID:</span>
                  <p className="font-mono">{result.user.rfidCard}</p>
                </div>
                <div>
                  <span className="text-slate-500">Biển số xe:</span>
                  <p className="font-medium">{result.user.licensePlate}</p>
                </div>
              </div>

              {result.activeBooking && (
                <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/30 rounded-xl flex flex-col gap-2">
                  <div className="flex items-center gap-2 font-bold text-green-800 dark:text-green-400">
                    <UserCheck className="h-5 w-5" />
                    <span>Lịch đặt đổi pin khả dụng</span>
                  </div>
                  <div className="text-xs text-green-700 dark:text-green-300">
                    Mã đặt chỗ: <span className="font-mono font-bold">{result.activeBooking.id}</span> | 
                    Hạn chót: <span className="font-semibold">{new Date(result.activeBooking.expiryTime).toLocaleTimeString()}</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 border-dashed rounded-xl p-12 text-center text-slate-500 flex flex-col items-center gap-3">
              <ShieldAlert className="h-10 w-10 text-slate-400" />
              <p className="text-sm">Chưa có kết quả tìm kiếm. Nhập mã thẻ hoặc biển số ở cột bên trái để bắt đầu.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
