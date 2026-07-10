import { type FC } from 'react';
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useUIStore } from '../store/uiStore';
import {
  BatteryCharging,
  LogOut,
  Menu,
  X,
  UserCheck,
  RefreshCw,
  AlertTriangle,
  ClipboardList,
  BarChart3,
  Package,
  Users,
  Sliders,
  Settings,
  Sun,
  Moon,
} from 'lucide-react';

export const DashboardLayout: FC = () => {
  const { user, logout, isStaff, isTechnician, isManager, isAdmin } = useAuth();
  const { sidebarOpen, toggleSidebar, theme, toggleTheme } = useUIStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Define sidebar menu items based on role
  const menuItems = [
    // Staff routes
    {
      path: '/dashboard/staff/verify',
      label: 'Xác thực khách',
      icon: UserCheck,
      visible: isStaff || isAdmin,
    },
    {
      path: '/dashboard/staff/swap',
      label: 'Giao dịch đổi pin',
      icon: RefreshCw,
      visible: isStaff || isAdmin,
    },
    // Technician routes
    {
      path: '/dashboard/tech/inspect',
      label: 'Kiểm tra pin lỗi',
      icon: AlertTriangle,
      visible: isTechnician || isAdmin,
    },
    {
      path: '/dashboard/tech/maintenance',
      label: 'Ghi chép bảo trì',
      icon: ClipboardList,
      visible: isTechnician || isAdmin,
    },
    // Manager routes
    {
      path: '/dashboard/manager/analytics',
      label: 'Báo cáo doanh thu',
      icon: BarChart3,
      visible: isManager || isAdmin,
    },
    {
      path: '/dashboard/manager/inventory',
      label: 'Tồn kho pin',
      icon: Package,
      visible: isManager || isAdmin,
    },
    // Admin routes
    {
      path: '/dashboard/admin/users',
      label: 'Quản lý người dùng',
      icon: Users,
      visible: isAdmin,
    },
    {
      path: '/dashboard/admin/stations',
      label: 'Cấu hình trạm sạc',
      icon: Sliders,
      visible: isAdmin,
    },
    {
      path: '/dashboard/admin/system',
      label: 'Thiết lập hệ thống',
      icon: Settings,
      visible: isAdmin,
    },
  ];

  const visibleMenuItems = menuItems.filter((item) => item.visible);

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex text-slate-800 dark:text-slate-205">
      {/* Sidebar */}
      <aside
        className={`bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 fixed inset-y-0 left-0 z-30 transform transition-all duration-300 ${
          sidebarOpen ? 'w-64 translate-x-0' : 'w-20 -translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800">
          <Link
            to="/dashboard"
            className="flex items-center gap-2 font-bold text-lg text-green-600 dark:text-green-500 overflow-hidden whitespace-nowrap"
          >
            <BatteryCharging className="h-6 w-6 flex-shrink-0" />
            {sidebarOpen && <span>Ops Panel</span>}
          </Link>
          <button
            onClick={toggleSidebar}
            className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-850"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="p-4 flex flex-col gap-1.5 h-[calc(100vh-120px)] overflow-y-auto">
          {visibleMenuItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-green-600 text-white shadow-md shadow-green-100 dark:shadow-none'
                      : 'text-slate-650 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
                  }`
                }
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {sidebarOpen && <span className="truncate">{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all"
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {sidebarOpen && <span>Đăng xuất</span>}
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${sidebarOpen ? 'lg:pl-64' : 'lg:pl-20'}`}>
        {/* Header */}
        <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 h-16 flex items-center justify-between px-6 sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-base sm:text-lg font-bold text-slate-850 dark:text-slate-100 leading-tight">
              Hệ thống Vận hành Pin
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
              title="Chuyển chế độ tối/sáng"
            >
              {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </button>

            {/* Profile Info */}
            <div className="flex items-center gap-3 pl-4 border-l border-slate-250 dark:border-slate-800">
              <div className="flex flex-col text-right">
                <span className="text-sm font-bold">{user?.name || 'Vận hành viên'}</span>
                <span className="text-xs text-slate-550 dark:text-slate-400 font-semibold uppercase">
                  {user?.role || 'Guest'}
                </span>
              </div>
              <div className="h-9 w-9 rounded-full bg-green-100 dark:bg-green-905 flex items-center justify-center font-bold text-green-700 dark:text-green-400">
                {user?.name ? user.name[0].toUpperCase() : 'O'}
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
