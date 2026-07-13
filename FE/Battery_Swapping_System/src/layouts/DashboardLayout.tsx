import { useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  AlertTriangle, BarChart3, BatteryCharging, Bell, Boxes, ChevronLeft, ChevronRight,
  ClipboardCheck, ClipboardList, Gauge, History, LogOut, Menu, Moon, ScanLine,
  Search, Settings, SlidersHorizontal, Sun, UserCheck, Users, Wrench, X,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services/authService';
import { Permissions, type Permission } from '../constants/permissions';
import { UserRole } from '../constants/roles';
import { useUIStore } from '../store/uiStore';

type NavItem = { to: string; label: string; icon: typeof Gauge; permission?: Permission };
type NavGroup = { label: string; items: NavItem[] };

const roleNavigation: Partial<Record<string, NavGroup[]>> = {
  [UserRole.STAFF]: [
    { label: 'Công việc', items: [
      { to: '/staff/dashboard', label: 'Tổng quan ca trực', icon: Gauge },
      { to: '/staff/check-in', label: 'Check-in khách hàng', icon: ScanLine, permission: Permissions.BOOKINGS_READ_ANY },
      { to: '/staff/history', label: 'Lịch sử tại trạm', icon: History, permission: Permissions.SWAPS_PROCESS },
    ] },
  ],
  [UserRole.TECHNICIAN]: [
    { label: 'Kỹ thuật pin', items: [
      { to: '/staff/dashboard', label: 'Tổng quan ca trực', icon: Gauge },
      { to: '/staff/inspections', label: 'Pin cần kiểm tra', icon: AlertTriangle, permission: Permissions.BATTERIES_FAULTY_READ },
      { to: '/staff/maintenance', label: 'Bảo trì pin', icon: Wrench, permission: Permissions.MAINTENANCE_CREATE },
    ] },
  ],
  [UserRole.MANAGER]: [
    { label: 'Điều hành trạm', items: [
      { to: '/manager/dashboard', label: 'Tổng quan', icon: Gauge },
      { to: '/manager/approvals', label: 'Duyệt lịch thay pin', icon: ClipboardCheck, permission: Permissions.BOOKINGS_APPROVE },
    ] },
    { label: 'Tài sản & phân tích', items: [
      { to: '/manager/inventory', label: 'Kho pin', icon: Boxes, permission: Permissions.INVENTORY_READ },
      { to: '/manager/reports', label: 'Báo cáo vận hành', icon: BarChart3, permission: Permissions.REPORTS_READ },
    ] },
  ],
  [UserRole.ADMIN]: [
    { label: 'Tổng quan', items: [{ to: '/admin/dashboard', label: 'Bảng điều khiển', icon: Gauge }] },
    { label: 'Danh tính & truy cập', items: [
      { to: '/admin/users', label: 'Người dùng', icon: Users, permission: Permissions.USERS_READ_ANY },
      { to: '/admin/station-assignments', label: 'Phân công trạm', icon: UserCheck, permission: Permissions.STATION_ASSIGNMENTS_MANAGE },
    ] },
    { label: 'Mạng lưới & danh mục', items: [
      { to: '/admin/stations', label: 'Trạm thay pin', icon: SlidersHorizontal, permission: Permissions.SETTINGS_MANAGE },
    ] },
    { label: 'Vận hành toàn hệ thống', items: [
      { to: '/admin/booking-approvals', label: 'Duyệt booking', icon: ClipboardCheck, permission: Permissions.BOOKINGS_APPROVE },
    ] },
    { label: 'Quy tắc & quản trị', items: [
      { to: '/admin/audit-logs', label: 'Nhật ký hệ thống', icon: ClipboardList, permission: Permissions.AUDIT_LOGS_READ },
      { to: '/admin/reports', label: 'Báo cáo tổng hợp', icon: BarChart3, permission: Permissions.REPORTS_READ },
      { to: '/admin/system-settings', label: 'Cấu hình hệ thống', icon: Settings, permission: Permissions.SETTINGS_MANAGE },
    ] },
  ],
};

const pageTitles: Record<string, string> = {
  dashboard: 'Bảng điều khiển', approvals: 'Duyệt lịch thay pin', bookings: 'Chi tiết đặt lịch',
  inventory: 'Kho pin', reports: 'Báo cáo', 'check-in': 'Tiếp nhận khách hàng', swaps: 'Quy trình thay pin',
  history: 'Lịch sử tại trạm', inspections: 'Kiểm tra pin', maintenance: 'Bảo trì pin', users: 'Quản lý người dùng',
  stations: 'Quản lý trạm', 'station-assignments': 'Phân công trạm', 'booking-approvals': 'Duyệt booking',
  'system-settings': 'Cấu hình hệ thống', 'audit-logs': 'Nhật ký hệ thống',
};

export const DashboardLayout = () => {
  const { user, logout, hasPermission } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useUIStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const groups = useMemo(() => (roleNavigation[user?.role ?? ''] ?? []).map((group) => ({
    ...group, items: group.items.filter((item) => !item.permission || hasPermission(item.permission)),
  })).filter((group) => group.items.length), [hasPermission, user?.role]);
  const currentSegment = location.pathname.split('/').filter(Boolean).at(-1) ?? 'dashboard';
  const title = pageTitles[currentSegment] ?? pageTitles[location.pathname.split('/')[2]] ?? 'Vận hành';
  const roleLabel = user?.role === UserRole.ADMIN ? 'Quản trị hệ thống' : user?.role === UserRole.MANAGER ? 'Quản lý trạm' : user?.role === UserRole.TECHNICIAN ? 'Kỹ thuật viên' : 'Nhân viên trạm';

  const signOut = async () => { try { await authService.logout(); } finally { logout(); navigate('/login'); } };
  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <div className="flex h-full flex-col bg-slate-950 text-slate-300">
      <div className={`flex h-[72px] items-center border-b border-white/10 ${collapsed && !mobile ? 'justify-center px-2' : 'gap-3 px-5'}`}>
        <Link to={user?.role === UserRole.ADMIN ? '/admin/dashboard' : user?.role === UserRole.MANAGER ? '/manager/dashboard' : '/staff/dashboard'} className="flex min-w-0 items-center gap-3" onClick={() => setMobileOpen(false)}>
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20"><BatteryCharging className="h-6 w-6" /></span>
          {(!collapsed || mobile) && <span className="min-w-0"><strong className="block truncate text-base text-white">BatterySwap</strong><span className="block truncate text-[11px] font-bold uppercase tracking-widest text-emerald-400">{roleLabel}</span></span>}
        </Link>
      </div>
      <nav className="scrollbar-thin flex-1 space-y-6 overflow-y-auto px-3 py-5" aria-label="Điều hướng chính">
        {groups.map((group) => <div key={group.label}>
          {(!collapsed || mobile) && <p className="mb-2 px-3 text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-500">{group.label}</p>}
          <div className="space-y-1">{group.items.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} onClick={() => setMobileOpen(false)} title={collapsed && !mobile ? label : undefined} className={({ isActive }) => `group flex min-h-11 items-center rounded-xl text-sm font-semibold transition ${collapsed && !mobile ? 'justify-center px-2' : 'gap-3 px-3'} ${isActive ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/10' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
            <Icon className="h-5 w-5 shrink-0" />{(!collapsed || mobile) && <span className="truncate">{label}</span>}
          </NavLink>)}</div>
        </div>)}
      </nav>
      <div className="border-t border-white/10 p-3">
        <div className={`flex items-center ${collapsed && !mobile ? 'justify-center' : 'gap-3 px-2'} py-2`}>
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-500/15 text-sm font-extrabold text-emerald-300">{user?.name?.charAt(0).toUpperCase() ?? 'U'}</div>
          {(!collapsed || mobile) && <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-white">{user?.name}</p><p className="truncate text-xs text-slate-500">{roleLabel}</p></div>}
          {(!collapsed || mobile) && <button onClick={() => void signOut()} className="rounded-lg p-2 text-slate-500 hover:bg-red-500/10 hover:text-red-400" aria-label="Đăng xuất"><LogOut className="h-4 w-4" /></button>}
        </div>
      </div>
    </div>
  );

  return <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
    {mobileOpen && <button aria-label="Đóng menu" className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />}
    <aside className={`fixed inset-y-0 left-0 z-50 w-[280px] transform transition-transform lg:hidden ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}><Sidebar mobile /><button aria-label="Đóng menu" onClick={() => setMobileOpen(false)} className="absolute right-3 top-4 rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white"><X className="h-5 w-5" /></button></aside>
    <aside className={`fixed inset-y-0 left-0 z-30 hidden transition-[width] duration-200 lg:block ${collapsed ? 'w-[76px]' : 'w-[264px]'}`}><Sidebar /></aside>
    <div className={`transition-[padding] duration-200 ${collapsed ? 'lg:pl-[76px]' : 'lg:pl-[264px]'}`}>
      <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-xl sm:px-6 dark:border-slate-800 dark:bg-slate-900/90">
        <div className="flex min-w-0 items-center gap-3">
          <button onClick={() => setMobileOpen(true)} className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 lg:hidden dark:text-slate-300 dark:hover:bg-slate-800" aria-label="Mở menu"><Menu className="h-5 w-5" /></button>
          <button onClick={() => setCollapsed((value) => !value)} className="hidden rounded-xl p-2 text-slate-500 hover:bg-slate-100 lg:block dark:hover:bg-slate-800" aria-label={collapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}>{collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}</button>
          <div className="min-w-0"><h1 className="truncate text-base font-extrabold text-slate-950 sm:text-lg dark:text-white">{title}</h1><p className="hidden text-xs text-slate-500 sm:block">Không gian làm việc · {roleLabel}</p></div>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <button className="hidden h-10 w-56 items-center gap-2 rounded-xl border bg-slate-50 px-3 text-left text-sm text-slate-400 xl:flex dark:bg-slate-950"><Search className="h-4 w-4" />Tìm kiếm...</button>
          <button onClick={toggleTheme} className="grid h-10 w-10 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800" aria-label={theme === 'dark' ? 'Bật giao diện sáng' : 'Bật giao diện tối'}>{theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}</button>
          <button className="relative grid h-10 w-10 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800" aria-label="Thông báo"><Bell className="h-5 w-5" /><span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-900" /></button>
          <div className="ml-1 hidden h-8 w-px bg-slate-200 sm:block dark:bg-slate-800" />
          <div className="hidden items-center gap-2 pl-1 sm:flex"><div className="grid h-9 w-9 place-items-center rounded-full bg-emerald-100 font-extrabold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">{user?.name?.charAt(0).toUpperCase() ?? 'U'}</div><div className="hidden lg:block"><p className="max-w-32 truncate text-xs font-bold">{user?.name}</p><p className="text-[11px] text-slate-500">{roleLabel}</p></div></div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8"><Outlet /></main>
    </div>
  </div>;
};
