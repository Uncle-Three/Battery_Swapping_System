import React from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { BatteryCharging, LogOut, User as UserIcon, History, MapPin, Calendar, Home } from 'lucide-react';
import { authService } from '../services/authService';

export const MainLayout: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await authService.logout();
    } finally {
      logout();
    }
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-905 flex flex-col text-slate-900 dark:text-slate-100 font-sans">
      {/* Navbar */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl text-green-600 dark:text-green-500">
            <BatteryCharging className="h-6 w-6" />
            <span>BatterySwap</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `flex items-center gap-1.5 text-sm font-medium transition-colors hover:text-green-600 dark:hover:text-green-400 ${
                  isActive ? 'text-green-600 dark:text-green-500' : 'text-slate-600 dark:text-slate-400'
                }`
              }
            >
              <Home className="h-4 w-4" />
              <span>Trang chủ</span>
            </NavLink>
            <NavLink
              to="/stations"
              className={({ isActive }) =>
                `flex items-center gap-1.5 text-sm font-medium transition-colors hover:text-green-600 dark:hover:text-green-400 ${
                  isActive ? 'text-green-600 dark:text-green-500' : 'text-slate-600 dark:text-slate-400'
                }`
              }
            >
              <MapPin className="h-4 w-4" />
              <span>Trạm sạc</span>
            </NavLink>
            {isAuthenticated && (
              <>
                <NavLink
                  to="/booking"
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 text-sm font-medium transition-colors hover:text-green-600 dark:hover:text-green-400 ${
                      isActive ? 'text-green-600 dark:text-green-500' : 'text-slate-600 dark:text-slate-400'
                    }`
                  }
                >
                  <Calendar className="h-4 w-4" />
                  <span>Đặt slot</span>
                </NavLink>
                <NavLink
                  to="/history"
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 text-sm font-medium transition-colors hover:text-green-600 dark:hover:text-green-400 ${
                      isActive ? 'text-green-600 dark:text-green-500' : 'text-slate-600 dark:text-slate-400'
                    }`
                  }
                >
                  <History className="h-4 w-4" />
                  <span>Lịch sử</span>
                </NavLink>
              </>
            )}
          </nav>

          <div className="flex items-center gap-4">
            {isAuthenticated && user ? (
              <div className="flex items-center gap-4">
                {user.role !== 'MEMBER' && (
                  <Link
                    to="/dashboard"
                    className="text-xs font-semibold px-3 py-1.5 bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400 rounded-lg hover:bg-green-100 transition-colors"
                  >
                    Vào Dashboard
                  </Link>
                )}
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-sm font-semibold">{user.name}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 capitalize">{user.role.toLowerCase()}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 transition-colors"
                  title="Đăng xuất"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-all"
              >
                <UserIcon className="h-4 w-4" />
                <span>Đăng nhập</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p>© 2026 BatterySwapping. All rights reserved.</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-green-600 transition-colors">Điều khoản</a>
            <a href="#" className="hover:text-green-600 transition-colors">Bảo mật</a>
            <a href="#" className="hover:text-green-600 transition-colors">Liên hệ</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
