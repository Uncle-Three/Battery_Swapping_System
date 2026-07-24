import { Link } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
export const NotFound = () => <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-4 text-center"><p className="text-sm font-bold text-slate-500">HTTP 404</p><h1 className="text-3xl font-black">Không tìm thấy trang</h1><p className="text-sm text-slate-500">Đường dẫn bạn yêu cầu không tồn tại.</p><Link to="/"><Button>Về trang chủ</Button></Link></div>;
