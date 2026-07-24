import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, BarChart3, BatteryCharging, Boxes, CheckCircle2, ClipboardCheck, ScanLine, ShieldCheck, Users, Wrench } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { UserRole } from '../../../constants/roles';

const dashboards = {
  [UserRole.STAFF]: {
    eyebrow: 'Trung tâm vận hành trạm', title: 'Bắt đầu ca trực an toàn', description: 'Check-in khách hàng, tiếp tục quy trình đang xử lý và theo dõi toàn bộ công việc tại trạm từ một nơi.',
    action: { to: '/staff/check-in', label: 'Check-in khách hàng', icon: ScanLine },
    cards: [
      { to: '/staff/check-in', title: 'Tra cứu & check-in', text: 'Quét mã hoặc nhập mã đặt lịch để xác thực khách hàng và xe.', icon: ScanLine, tone: 'emerald' },
      { to: '/staff/history', title: 'Lịch sử tại trạm', text: 'Tra cứu các ca thay pin đã hoàn tất theo thời gian và kết quả.', icon: CheckCircle2, tone: 'blue' },
    ],
  },
  [UserRole.TECHNICIAN]: {
    eyebrow: 'Trung tâm kỹ thuật pin', title: 'Kiểm soát chất lượng pin', description: 'Ưu tiên pin có cảnh báo, ghi nhận chẩn đoán và bảo trì với đầy đủ lịch sử kỹ thuật.',
    action: { to: '/staff/inspections', label: 'Xem pin cần kiểm tra', icon: AlertTriangle },
    cards: [
      { to: '/staff/inspections', title: 'Hàng đợi kiểm tra', text: 'Xem pin lỗi hoặc suy giảm cần đánh giá kỹ thuật.', icon: ShieldCheck, tone: 'amber' },
      { to: '/staff/maintenance', title: 'Hồ sơ bảo trì', text: 'Tạo và theo dõi các hoạt động bảo trì pin tại trạm.', icon: Wrench, tone: 'blue' },
    ],
  },
  [UserRole.MANAGER]: {
    eyebrow: 'Điều hành trạm', title: 'Ưu tiên quyết định quan trọng', description: 'Duyệt yêu cầu thay pin theo mức độ an toàn, kiểm soát tồn kho tương thích và theo dõi hiệu suất trạm.',
    action: { to: '/manager/approvals', label: 'Duyệt yêu cầu tiếp theo', icon: ClipboardCheck },
    cards: [
      { to: '/manager/approvals', title: 'Hàng đợi phê duyệt', text: 'Xử lý lịch ưu tiên, yêu cầu nguy hiểm và đề xuất đổi lịch.', icon: ClipboardCheck, tone: 'amber' },
      { to: '/manager/inventory', title: 'Tình trạng kho pin', text: 'Theo dõi pin sẵn sàng, đã giữ chỗ, cách ly và bảo trì.', icon: Boxes, tone: 'emerald' },
      { to: '/manager/reports', title: 'Hiệu suất vận hành', text: 'Phân tích sản lượng, thời gian xử lý và mức sử dụng kho.', icon: BarChart3, tone: 'blue' },
    ],
  },
  [UserRole.ADMIN]: {
    eyebrow: 'Quản trị nền tảng', title: 'Kiểm soát toàn bộ hệ thống', description: 'Quản lý quyền truy cập, duyệt hồ sơ chuyển xe, mạng lưới trạm và cấu hình toàn hệ thống.',
    action: { to: '/admin/vehicle-transfers', label: 'Duyệt chuyển quyền xe', icon: ShieldCheck },
    cards: [
      { to: '/admin/users', title: 'Danh tính & truy cập', text: 'Quản lý người dùng, vai trò và trạng thái tài khoản.', icon: Users, tone: 'blue' },
      { to: '/admin/vehicle-transfers', title: 'Duyệt đơn chuyển nhượng', text: 'Thẩm định chứng từ và phê duyệt chuyển quyền sở hữu xe cũ.', icon: ShieldCheck, tone: 'amber' },
      { to: '/admin/stations', title: 'Mạng lưới trạm', text: 'Cấu hình thông tin trạm và phạm vi vận hành.', icon: BatteryCharging, tone: 'emerald' },
    ],
  },
} as const;

const toneClass = { emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300', blue: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300', amber: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300', violet: 'bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300' };

export const DashboardHome = () => {
  const { user } = useAuth();
  const content = dashboards[user?.role as keyof typeof dashboards] ?? dashboards[UserRole.STAFF];
  const ActionIcon = content.action.icon;
  return <div className="space-y-7">
    <section className="relative overflow-hidden rounded-3xl bg-slate-950 px-6 py-8 text-white sm:px-8 sm:py-10">
      <div className="soft-grid absolute inset-0 opacity-40" /><div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" />
      <div className="relative flex flex-col items-start justify-between gap-7 lg:flex-row lg:items-end"><div className="max-w-3xl"><p className="text-xs font-extrabold uppercase tracking-[.2em] text-emerald-400">{content.eyebrow}</p><h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">{content.title}</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">{content.description}</p><p className="mt-5 text-sm text-slate-400">Xin chào, <strong className="text-white">{user?.name ?? 'thành viên vận hành'}</strong>. Mọi thao tác đều được kiểm soát theo vai trò và phạm vi trạm.</p></div><Link to={content.action.to} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-emerald-500 px-5 text-sm font-extrabold text-slate-950 transition hover:bg-emerald-400"><ActionIcon className="h-5 w-5" />{content.action.label}<ArrowRight className="h-4 w-4" /></Link></div>
    </section>
    <div><p className="eyebrow">Không gian làm việc</p><h3 className="mt-2 text-xl font-extrabold">Truy cập nhanh theo vai trò</h3><p className="page-description">Chỉ các nghiệp vụ bạn được cấp quyền mới xuất hiện trong khu vực này.</p></div>
    <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">{content.cards.map(({ to, title, text, icon: Icon, tone }) => <Link key={to} to={to} className="app-panel-hover group flex min-h-52 flex-col p-6"><span className={`grid h-12 w-12 place-items-center rounded-2xl ${toneClass[tone]}`}><Icon className="h-6 w-6" /></span><h4 className="mt-5 font-extrabold text-slate-950 dark:text-white">{title}</h4><p className="mt-2 flex-1 text-sm leading-6 text-slate-500 dark:text-slate-400">{text}</p><span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-emerald-700 dark:text-emerald-400">Mở không gian <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span></Link>)}</section>
    <section className="app-panel flex flex-col gap-4 p-5 sm:flex-row sm:items-center"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"><ShieldCheck className="h-5 w-5" /></span><div><h4 className="font-extrabold">Nguyên tắc vận hành an toàn</h4><p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">Không bỏ qua bước xác minh, không tự thay đổi trạng thái và luôn quét đúng serial pin. Hệ thống sẽ chỉ mở hành động hợp lệ cho trạng thái hiện tại.</p></div></section>
  </div>;
};

export default DashboardHome;
