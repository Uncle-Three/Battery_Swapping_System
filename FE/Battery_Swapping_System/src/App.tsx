import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { RouteGuard } from './components/RouteGuard';
import { UserRole } from './constants/roles';
import { Permissions } from './constants/permissions';

// Layouts
import { MainLayout } from './layouts/MainLayout';
import { DashboardLayout } from './layouts/DashboardLayout';

// Customer Pages
import { Home } from './features/customer/pages/Home';
import { Stations } from './features/customer/pages/Stations';
import { Booking } from './features/customer/pages/Booking';
import { Payment } from './features/customer/pages/Payment';
import { History } from './features/customer/pages/History';
import { Login } from './features/customer/pages/Login';
import { Unauthorized } from './features/customer/pages/Unauthorized';

// Dashboard Pages
import { DashboardHome } from './features/dashboard/pages/DashboardHome';
import { VerifyCustomer } from './features/dashboard/pages/staff/VerifyCustomer';
import { ProcessSwap } from './features/dashboard/pages/staff/ProcessSwap';
import { BatteryInspect } from './features/dashboard/pages/technician/BatteryInspect';
import { MaintenanceForm } from './features/dashboard/pages/technician/MaintenanceForm';
import { Analytics } from './features/dashboard/pages/manager/Analytics';
import { Inventory } from './features/dashboard/pages/manager/Inventory';
import { UserManagement } from './features/dashboard/pages/admin/UserManagement';
import { StationConfig } from './features/dashboard/pages/admin/StationConfig';
import { SystemConfig } from './features/dashboard/pages/admin/SystemConfig';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Customer & Guest Routes */}
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Home />} />
          <Route path="stations" element={<Stations />} />
          <Route path="login" element={<Login />} />
          <Route path="unauthorized" element={<Unauthorized />} />
          
          {/* Protected Customer Routes */}
          <Route
            path="booking"
            element={
              <RouteGuard allowedRoles={[UserRole.MEMBER, UserRole.ADMIN]} requiredPermissions={[Permissions.BOOKINGS_CREATE]}>
                <Booking />
              </RouteGuard>
            }
          />
          <Route
            path="payment"
            element={
              <RouteGuard allowedRoles={[UserRole.MEMBER, UserRole.ADMIN]} requiredPermissions={[Permissions.PAYMENTS_MANAGE_SELF]}>
                <Payment />
              </RouteGuard>
            }
          />
          <Route
            path="history"
            element={
              <RouteGuard allowedRoles={[UserRole.MEMBER, UserRole.ADMIN]} requiredPermissions={[Permissions.SWAPS_READ_SELF]}>
                <History />
              </RouteGuard>
            }
          />
        </Route>

        {/* Dashboard Operation Routes */}
        <Route
          path="/dashboard"
          element={
            <RouteGuard
              allowedRoles={[
                UserRole.STAFF,
                UserRole.TECHNICIAN,
                UserRole.MANAGER,
                UserRole.ADMIN,
              ]}
            >
              <DashboardLayout />
            </RouteGuard>
          }
        >
          <Route index element={<DashboardHome />} />

          {/* Staff Section */}
          <Route
            path="staff/verify"
            element={
              <RouteGuard allowedRoles={[UserRole.STAFF, UserRole.ADMIN]} requiredPermissions={[Permissions.BOOKINGS_READ_ANY]}>
                <VerifyCustomer />
              </RouteGuard>
            }
          />
          <Route
            path="staff/swap"
            element={
              <RouteGuard allowedRoles={[UserRole.STAFF, UserRole.ADMIN]} requiredPermissions={[Permissions.SWAPS_PROCESS]}>
                <ProcessSwap />
              </RouteGuard>
            }
          />

          {/* Technician Section */}
          <Route
            path="tech/inspect"
            element={
              <RouteGuard allowedRoles={[UserRole.TECHNICIAN, UserRole.ADMIN]} requiredPermissions={[Permissions.BATTERIES_FAULTY_READ]}>
                <BatteryInspect />
              </RouteGuard>
            }
          />
          <Route
            path="tech/maintenance"
            element={
              <RouteGuard allowedRoles={[UserRole.TECHNICIAN, UserRole.ADMIN]} requiredPermissions={[Permissions.MAINTENANCE_CREATE]}>
                <MaintenanceForm />
              </RouteGuard>
            }
          />

          {/* Manager Section */}
          <Route
            path="manager/analytics"
            element={
              <RouteGuard allowedRoles={[UserRole.MANAGER, UserRole.ADMIN]} requiredPermissions={[Permissions.REPORTS_READ]}>
                <Analytics />
              </RouteGuard>
            }
          />
          <Route
            path="manager/inventory"
            element={
              <RouteGuard allowedRoles={[UserRole.MANAGER, UserRole.ADMIN]} requiredPermissions={[Permissions.INVENTORY_READ]}>
                <Inventory />
              </RouteGuard>
            }
          />

          {/* Admin Section */}
          <Route
            path="admin/users"
            element={
              <RouteGuard allowedRoles={[UserRole.ADMIN]} requiredPermissions={[Permissions.USERS_READ_ANY]}>
                <UserManagement />
              </RouteGuard>
            }
          />
          <Route
            path="admin/stations"
            element={
              <RouteGuard allowedRoles={[UserRole.ADMIN]} requiredPermissions={[Permissions.SETTINGS_MANAGE]}>
                <StationConfig />
              </RouteGuard>
            }
          />
          <Route
            path="admin/system"
            element={
              <RouteGuard allowedRoles={[UserRole.ADMIN]} requiredPermissions={[Permissions.SETTINGS_MANAGE]}>
                <SystemConfig />
              </RouteGuard>
            }
          />
        </Route>

        {/* Fallback redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
