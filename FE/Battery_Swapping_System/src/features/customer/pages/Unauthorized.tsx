import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { Button } from '../../../components/ui/Button';

export const Unauthorized = () => <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-5 text-center"><ShieldAlert className="h-16 w-16 text-red-600" /><div><p className="text-sm font-bold text-red-600">HTTP 403</p><h1 className="text-3xl font-black">Bạn không có quyền truy cập</h1><p className="mt-2 text-sm text-slate-500">Tài khoản hiện tại không được phép sử dụng chức năng này.</p></div><Link to="/"><Button>Về trang chủ</Button></Link></div>;
export default Unauthorized;
