import React from 'react';
import { Button } from '../../../components/ui/Button';

interface PaymentSummaryProps {
  amount: number;
  paymentMethod: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const PaymentSummary: React.FC<PaymentSummaryProps> = ({
  amount,
  paymentMethod,
  onConfirm,
  onCancel,
}) => {
  return (
    <div className="flex flex-col gap-4 border border-slate-200 dark:border-slate-800 rounded-xl p-5 bg-white dark:bg-slate-900 max-w-sm w-full">
      <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">Chi tiết thanh toán</h3>
      <div className="flex justify-between text-sm py-2 border-b border-slate-100 dark:border-slate-800">
        <span className="text-slate-500">Mô tả</span>
        <span className="font-medium">Thanh toán dịch vụ thay pin</span>
      </div>
      <div className="flex justify-between text-sm py-2 border-b border-slate-100 dark:border-slate-800">
        <span className="text-slate-500">Phương thức</span>
        <span className="font-medium capitalize">{paymentMethod}</span>
      </div>
      <div className="flex justify-between text-lg font-bold py-3">
        <span>Tổng cộng</span>
        <span className="text-green-600 dark:text-green-500">{amount.toLocaleString()} VND</span>
      </div>

      <div className="flex gap-3 justify-end mt-4">
        <Button variant="outline" onClick={onCancel} className="w-full">
          Hủy
        </Button>
        <Button variant="primary" onClick={onConfirm} className="w-full">
          Thanh toán ngay
        </Button>
      </div>
    </div>
  );
};
