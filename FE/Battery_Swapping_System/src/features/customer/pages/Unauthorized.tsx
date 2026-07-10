import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { ShieldAlert } from 'lucide-react';

export const Unauthorized: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center gap-6 max-w-md mx-auto">
      <div className="p-4 bg-red-50 dark:bg-red-950/20 text-red-650 dark:text-red-400 rounded-full">
        <ShieldAlert className="h-16 w-16" />
      </div>
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white">Không có quyền truy cập</h1>
        <p className="text-sm text-slate-500 mt-2">
          Tài khoản hiện tại của bạn không được cấp quyền truy cập vào chức năng hoặc phân vùng này. Vui lòng liên hệ quản trị viên.
        </p>
      </div>
      <div className="flex gap-4 w-full">
        <Button variant="outline" onClick={() => navigate(-1)} className="w-full">
          Quay lại
        </Button>
        <Button variant="primary" onClick={() => navigate('/')} className="w-full">
          Về trang chủ
        </Button>
      </div>
    </div>
  );
};
export default Unauthorized;
