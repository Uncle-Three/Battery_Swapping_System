import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { useEffect, useState, type ReactNode } from 'react';
import { AuthenticatedRoute, PublicRoute, RoleRoute, StationScopedRoute } from './components/RouteGuard';
import { UserRole, type UserRole as UserRoleType } from './constants/roles';
import { roleDashboard } from './constants/routes';
import { useAuth } from './hooks/useAuth';
import { MainLayout } from './layouts/MainLayout';
import { DashboardLayout } from './layouts/DashboardLayout';
import { Home } from './features/customer/pages/Home';
import { Booking } from './features/customer/pages/Booking';
import { History } from './features/customer/pages/History';
import { Login } from './features/customer/pages/Login';
import { Unauthorized } from './features/customer/pages/Unauthorized';
import { Register } from './features/customer/pages/Register';
import { NotFound } from './features/customer/pages/NotFound';
import { MemberDashboard } from './features/customer/pages/MemberDashboard';
import { Vehicles } from './features/customer/pages/Vehicles';
import { VehicleDetail } from './features/customer/pages/VehicleDetail';
import { BatteryHealth } from './features/customer/pages/BatteryHealth';
import { BatteryHealthHistory } from './features/customer/pages/BatteryHealthHistory';
import { Bookings } from './features/customer/pages/Bookings';
import { BookingDetail } from './features/customer/pages/BookingDetail';
import { PaymentBooking } from './features/customer/pages/PaymentBooking';
import { VNPayReturn } from './features/customer/pages/VNPayReturn';
import { Notifications } from './features/customer/pages/Notifications';
import { DashboardHome } from './features/dashboard/pages/DashboardHome';
import { VerifyCustomer } from './features/dashboard/pages/staff/VerifyCustomer';
import { ProcessSwap } from './features/dashboard/pages/staff/ProcessSwap';
import { StaffHistory } from './features/dashboard/pages/staff/StaffHistory';
import { BatteryInspect } from './features/dashboard/pages/technician/BatteryInspect';
import { MaintenanceForm } from './features/dashboard/pages/technician/MaintenanceForm';
import { Analytics } from './features/dashboard/pages/manager/Analytics';
import { Inventory } from './features/dashboard/pages/manager/Inventory';
import { BookingApproval } from './features/dashboard/pages/manager/BookingApproval';
import { ManagerBookingDetail } from './features/dashboard/pages/manager/ManagerBookingDetail';
import { UserManagement } from './features/dashboard/pages/admin/UserManagement';
import { SystemConfig } from './features/dashboard/pages/admin/SystemConfig';
import { AuditLogs } from './features/dashboard/pages/admin/AuditLogs';
import { StationAssignments } from './features/dashboard/pages/admin/StationAssignments';
import { AdminReports } from './features/dashboard/pages/admin/AdminReports';

// New Station Module
import { StationList } from './features/dashboard/pages/admin/stations/StationList';
import { CreateStation } from './features/dashboard/pages/admin/stations/CreateStation';
import { StationDetailHub } from './features/dashboard/pages/admin/stations/StationDetailHub';
import { StationOverview } from './features/dashboard/pages/admin/stations/tabs/StationOverview';
import { StationSlots } from './features/dashboard/pages/admin/stations/tabs/StationSlots';
import { StationInventory } from './features/dashboard/pages/admin/stations/tabs/StationInventory';
import { StationBookings } from './features/dashboard/pages/admin/stations/tabs/StationBookings';
import { StationStaff } from './features/dashboard/pages/admin/stations/tabs/StationStaff';
import { StationMaintenance } from './features/dashboard/pages/admin/stations/tabs/StationMaintenance';
import { StationReports } from './features/dashboard/pages/admin/stations/tabs/StationReports';
import { StationAuditLogs } from './features/dashboard/pages/admin/stations/tabs/StationAuditLogs';
import { authService } from './services/authService';
import { ApiClientError } from './services/apiClient';

const AuthBootstrap = ({ children }: { children: ReactNode }) => {
  const { token, user, login, logout } = useAuth();
  const [ready, setReady] = useState(false);
  const [hasCachedSession] = useState(() => Boolean(token && user));

  useEffect(() => {
    let active = true;

    authService.restoreSession()
      .then((session) => {
        if (active) login(session.accessToken, session.user);
      })
      .catch((error: unknown) => {
        // Only clear a cached login when the server explicitly rejects the
        // refresh token. A backend restart/network gap must not log users out.
        if (active && hasCachedSession && error instanceof ApiClientError && error.status === 401) {
          logout();
        }
      })
      .finally(() => {
        if (active) setReady(true);
      });

    return () => {
      active = false;
    };
  }, [hasCachedSession, login, logout]);

  if (!ready) {
    return <div className="grid min-h-screen place-items-center bg-slate-950 text-sm font-bold text-slate-300">Đang khôi phục phiên đăng nhập...</div>;
  }

  return <>{children}</>;
};

const ProtectedLayout = ({ roles, dashboard = false }: { roles: UserRoleType[]; dashboard?: boolean }) => (
  <AuthenticatedRoute>
    <RoleRoute allowedRoles={roles}>
      {dashboard ? <DashboardLayout /> : <MainLayout />}
    </RoleRoute>
  </AuthenticatedRoute>
);

const RoleLanding = () => {
  const { user } = useAuth();
  return <Navigate to={roleDashboard(user?.role)} replace />;
};

const LegacyEntityRedirect = ({ target, parameter }: { target: string; parameter: string }) => {
  const params = useParams();
  const location = useLocation();
  return <Navigate to={`${target}/${params[parameter] ?? ''}${location.search}${location.hash}`} replace />;
};

const LegacyRedirect = ({ target }: { target: string }) => {
  const location = useLocation();
  return <Navigate to={`${target}${location.search}${location.hash}`} replace />;
};

function App() {
  return (
    <AuthBootstrap>
      <BrowserRouter>
        <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
          <Route path="/403" element={<Unauthorized />} />
          <Route path="/404" element={<NotFound />} />
          <Route path="/payments/vnpay/return" element={<VNPayReturn />} />
        </Route>

        <Route path="/app" element={<ProtectedLayout roles={[UserRole.MEMBER]} />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<MemberDashboard />} />
          <Route path="vehicles" element={<Vehicles />} />
          <Route path="vehicles/:vehicleId" element={<VehicleDetail />} />
          <Route path="battery-health" element={<Navigate to="current" replace />} />
          <Route path="battery-health/current" element={<BatteryHealth />} />
          <Route path="battery-health/history" element={<BatteryHealthHistory />} />

          <Route path="bookings" element={<Bookings />} />
          <Route path="bookings/new" element={<Booking />} />
          <Route path="bookings/:bookingId" element={<BookingDetail />} />
          <Route path="priority-replacement" element={<Booking />} />
          <Route path="payments/:bookingId" element={<PaymentBooking />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="replacement-history" element={<History />} />
        </Route>

        <Route path="/manager" element={<ProtectedLayout roles={[UserRole.MANAGER]} dashboard />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DashboardHome />} />
          <Route path="approvals" element={<StationScopedRoute><BookingApproval /></StationScopedRoute>} />
          <Route path="bookings" element={<BookingApproval />} />
          <Route path="bookings/:bookingId" element={<StationScopedRoute><ManagerBookingDetail /></StationScopedRoute>} />
          <Route path="inventory" element={<StationScopedRoute><Inventory /></StationScopedRoute>} />
          <Route path="reports" element={<StationScopedRoute><Analytics /></StationScopedRoute>} />
        </Route>

        <Route path="/staff" element={<ProtectedLayout roles={[UserRole.STAFF, UserRole.TECHNICIAN]} dashboard />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DashboardHome />} />
          <Route path="check-in" element={<StationScopedRoute><VerifyCustomer /></StationScopedRoute>} />
          <Route path="swaps/:swapId" element={<StationScopedRoute><ProcessSwap /></StationScopedRoute>} />
          <Route path="history" element={<StationScopedRoute><StaffHistory /></StationScopedRoute>} />
          <Route path="inspections" element={<BatteryInspect />} />
          <Route path="maintenance" element={<MaintenanceForm />} />
        </Route>

        <Route path="/admin" element={<ProtectedLayout roles={[UserRole.ADMIN]} dashboard />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DashboardHome />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="booking-approvals" element={<BookingApproval />} />
          <Route path="booking-approvals/:bookingId" element={<ManagerBookingDetail />} />
          
          {/* Station Management Module */}
          <Route path="stations" element={<StationList />} />
          <Route path="stations/new" element={<CreateStation />} />
          <Route path="stations/:stationId/edit" element={<CreateStation />} />
          <Route path="stations/:stationId" element={<StationDetailHub />}>
            <Route index element={<Navigate to="overview" replace />} />
            <Route path="overview" element={<StationOverview />} />
            <Route path="bays-slots" element={<StationSlots />} />
            <Route path="inventory" element={<StationInventory />} />
            <Route path="bookings" element={<StationBookings />} />
            <Route path="bookings/:bookingId" element={<ManagerBookingDetail />} />
            <Route path="staff" element={<StationStaff />} />
            <Route path="maintenance" element={<StationMaintenance />} />
            <Route path="reports" element={<StationReports />} />
            <Route path="audit-logs" element={<StationAuditLogs />} />
          </Route>

          <Route path="station-assignments" element={<StationAssignments />} />
          <Route path="system-settings" element={<SystemConfig />} />
          <Route path="audit-logs" element={<AuditLogs />} />
          <Route path="reports" element={<AdminReports />} />
        </Route>

        <Route element={<AuthenticatedRoute><Outlet /></AuthenticatedRoute>}>
          <Route path="/dashboard" element={<Navigate to="/app/dashboard" replace />} />
          <Route path="/vehicles" element={<Navigate to="/app/vehicles" replace />} />
          <Route path="/vehicles/:vehicleId" element={<LegacyEntityRedirect target="/app/vehicles" parameter="vehicleId" />} />
          <Route path="/battery-health" element={<Navigate to="/app/battery-health/current" replace />} />
          <Route path="/battery-health/history" element={<Navigate to="/app/battery-health/history" replace />} />

          <Route path="/booking" element={<LegacyRedirect target="/app/bookings/new" />} />
          <Route path="/bookings/create" element={<LegacyRedirect target="/app/bookings/new" />} />
          <Route path="/priority-booking" element={<LegacyRedirect target="/app/priority-replacement" />} />
          <Route path="/bookings" element={<Navigate to="/app/bookings" replace />} />
          <Route path="/bookings/:bookingId" element={<LegacyEntityRedirect target="/app/bookings" parameter="bookingId" />} />
          <Route path="/payments/:bookingId" element={<LegacyEntityRedirect target="/app/payments" parameter="bookingId" />} />
          <Route path="/notifications" element={<Navigate to="/app/notifications" replace />} />
          <Route path="/history" element={<Navigate to="/app/replacement-history" replace />} />
          <Route path="/replacement-history" element={<Navigate to="/app/replacement-history" replace />} />
          <Route path="/wallet" element={<Navigate to="/app/bookings" replace />} />
          <Route path="/payment" element={<Navigate to="/app/bookings" replace />} />
          <Route path="/unauthorized" element={<Navigate to="/403" replace />} />
          <Route path="/ops" element={<RoleLanding />} />
          <Route path="/ops/staff/verify" element={<Navigate to="/staff/check-in" replace />} />
          <Route path="/ops/staff/swap/:swapId" element={<LegacyEntityRedirect target="/staff/swaps" parameter="swapId" />} />
          <Route path="/ops/staff/history" element={<Navigate to="/staff/history" replace />} />
          <Route path="/ops/tech/inspect" element={<Navigate to="/staff/inspections" replace />} />
          <Route path="/ops/tech/maintenance" element={<Navigate to="/staff/maintenance" replace />} />
          <Route path="/ops/manager/bookings" element={<Navigate to="/manager/approvals" replace />} />
          <Route path="/ops/manager/bookings/:bookingId" element={<LegacyEntityRedirect target="/manager/bookings" parameter="bookingId" />} />
          <Route path="/ops/manager/analytics" element={<Navigate to="/manager/reports" replace />} />
          <Route path="/ops/manager/inventory" element={<Navigate to="/manager/inventory" replace />} />
          <Route path="/ops/admin/users" element={<Navigate to="/admin/users" replace />} />
          <Route path="/ops/admin/stations" element={<Navigate to="/admin/stations" replace />} />
          <Route path="/ops/admin/station-assignments" element={<Navigate to="/admin/station-assignments" replace />} />
          <Route path="/ops/admin/system" element={<Navigate to="/admin/system-settings" replace />} />
          <Route path="/ops/admin/audit-logs" element={<Navigate to="/admin/audit-logs" replace />} />
          <Route path="/ops/admin/reports" element={<Navigate to="/admin/reports" replace />} />
        </Route>

        <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthBootstrap>
  );
}

export default App;
