import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { BatteryCharging, Bell, CalendarClock, CarFront, Gauge, History, LogOut, Menu, ShieldCheck, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services/authService';
import { memberService } from '../services/memberService';
import { roleDashboard } from '../constants/routes';
import { useUnreadNotifications } from '../hooks/useUnreadNotifications';

const memberItems = [
  { to: '/app/dashboard', label: 'Tổng quan', icon: Gauge },
  { to: '/app/vehicles', label: 'Xe của tôi', icon: CarFront },
  { to: '/app/vehicle-transfer', label: 'Chuyển quyền xe', icon: ShieldCheck },
  { to: '/app/bookings', label: 'Lịch thay pin', icon: CalendarClock },
  { to: '/app/replacement-history', label: 'Lịch sử thay pin', icon: History },
];

export const MainLayout = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const isMember = isAuthenticated && user?.role === 'MEMBER';
  const showMemberSidebar = isMember && location.pathname.startsWith('/app');
  const unreadNotificationCount = useUnreadNotifications(showMemberSidebar);

  const signOut = async () => { try { await authService.logout(); } finally { memberService.clearDashboardCache(); logout(); navigate('/login'); } };
  const navClass = ({ isActive }: { isActive: boolean }) => `flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-bold transition ${isActive ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'}`;

  return <div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-100">
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/90">
      <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          {showMemberSidebar && <button onClick={() => setMenuOpen(true)} className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 lg:hidden dark:text-slate-300 dark:hover:bg-slate-800" aria-label="Mở menu"><Menu className="h-5 w-5" /></button>}
          <Link to="/" className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-200 dark:shadow-none"><BatteryCharging className="h-6 w-6" /></span><span><strong className="block text-base font-extrabold leading-tight">BatterySwap</strong><span className="hidden text-[10px] font-bold uppercase tracking-[.16em] text-emerald-700 sm:block dark:text-emerald-400">Chăm sóc pin xe điện</span></span></Link>
        </div>
        {!showMemberSidebar && <nav className="hidden items-center gap-7 md:flex"><Link to="/" className="text-sm font-bold text-slate-600 hover:text-emerald-700 dark:text-slate-300">Trang chủ</Link><a href="/#workflow" className="text-sm font-bold text-slate-600 hover:text-emerald-700 dark:text-slate-300">Quy trình</a><Link to={isAuthenticated ? '/app/dashboard' : '/login'} className="text-sm font-bold text-slate-600 hover:text-emerald-700 dark:text-slate-300">Trạm dịch vụ</Link></nav>}
        <div className="flex items-center gap-1 sm:gap-2">
          {showMemberSidebar && <Link to="/app/notifications" className="relative grid h-10 w-10 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800" aria-label={unreadNotificationCount > 0 ? `Thông báo, ${unreadNotificationCount} chưa đọc` : 'Thông báo'}><Bell className="h-5 w-5" />{unreadNotificationCount > 0 && <span className="absolute right-1 top-1 min-w-4 rounded-full bg-red-500 px-1 text-center text-[10px] font-bold leading-4 text-white ring-2 ring-white dark:ring-slate-900">{unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}</span>}</Link>}
          {isAuthenticated && user ? <><div className="hidden items-center gap-2 px-2 sm:flex"><div className="grid h-9 w-9 place-items-center rounded-full bg-emerald-100 text-sm font-extrabold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">{user.name?.charAt(0)?.toUpperCase()}</div><span className="max-w-32 truncate text-sm font-bold">{user.name}</span></div>{user.role !== 'MEMBER' && <Link className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white" to={roleDashboard(user.role)}>Vào vận hành</Link>}<button onClick={() => void signOut()} className="grid h-10 w-10 place-items-center rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30" aria-label="Đăng xuất"><LogOut className="h-5 w-5" /></button></> : <><Link to="/login" className="hidden rounded-xl px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 sm:block dark:text-slate-200 dark:hover:bg-slate-800">Đăng nhập</Link><Link to="/register" className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700">Bắt đầu</Link></>}
        </div>
      </div>
    </header>

    {showMemberSidebar && menuOpen && <button className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden" aria-label="Đóng menu" onClick={() => setMenuOpen(false)} />}
    {showMemberSidebar && <aside className={`fixed inset-y-0 left-0 z-50 w-[280px] transform border-r bg-white transition-transform lg:top-[72px] lg:z-20 lg:translate-x-0 dark:bg-slate-900 ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex h-[72px] items-center justify-between border-b px-5 lg:hidden"><strong>Không gian của tôi</strong><button onClick={() => setMenuOpen(false)} className="rounded-lg p-2" aria-label="Đóng menu"><X className="h-5 w-5" /></button></div>
      <div className="flex h-full flex-col p-4"><div className="mb-5 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 p-4 text-white"><p className="text-xs font-bold uppercase tracking-wider text-emerald-100">Trạng thái tài khoản</p><p className="mt-1 font-extrabold">Theo dõi pin an toàn</p><Link to="/app/bookings/new" onClick={() => setMenuOpen(false)} className="mt-4 block rounded-xl bg-white/15 px-3 py-2 text-center text-sm font-bold hover:bg-white/25">+ Đặt lịch thay pin</Link></div><nav className="space-y-1" aria-label="Điều hướng người dùng">{memberItems.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} onClick={() => setMenuOpen(false)} className={navClass}><Icon className="h-5 w-5" />{label}</NavLink>)}</nav></div>
    </aside>}

    <div className={showMemberSidebar ? 'lg:pl-[280px]' : ''}>
      <main className={`mx-auto min-h-[calc(100vh-72px)] w-full ${showMemberSidebar ? 'max-w-[1600px] p-4 sm:p-6 lg:p-8' : 'max-w-[1440px] px-4 py-8 sm:px-6 lg:py-12'}`}><Outlet /></main>
      {!showMemberSidebar && <footer className="border-t bg-white dark:bg-slate-900"><div className="mx-auto flex max-w-[1440px] flex-col items-center justify-between gap-3 px-6 py-8 text-sm text-slate-500 sm:flex-row"><p>© 2026 BatterySwap · Hệ thống quản lý thay pin xe điện</p><div className="flex gap-5"><a href="#support">Hỗ trợ</a><a href="#privacy">Quyền riêng tư</a><a href="#status">Trạng thái hệ thống</a></div></div></footer>}
    </div>
  </div>;
};
