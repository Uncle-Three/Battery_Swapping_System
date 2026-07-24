import { type ReactNode, type FC } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { type UserRole } from '../constants/roles';
import type { Permission } from '../constants/permissions';
import { roleDashboard } from '../constants/routes';

interface RouteGuardProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
  requiredPermissions?: Permission[];
}

interface ChildrenProps {
  children: ReactNode;
}

export const PublicRoute: FC<ChildrenProps> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  return isAuthenticated ? <Navigate to={roleDashboard(user?.role)} replace /> : <>{children}</>;
};

export const AuthenticatedRoute: FC<ChildrenProps> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  return isAuthenticated
    ? <>{children}</>
    : <Navigate to="/login" state={{ from: `${location.pathname}${location.search}${location.hash}` }} replace />;
};

export const RoleRoute: FC<ChildrenProps & { allowedRoles: UserRole[] }> = ({ children, allowedRoles }) => {
  const { hasAnyRole } = useAuth();
  return hasAnyRole(allowedRoles) ? <>{children}</> : <Navigate to="/403" replace />;
};

export const StationScopedRoute: FC<ChildrenProps> = ({ children }) => {
  // Entity APIs remain authoritative for station scope. This boundary gives
  // station-owned routes a dedicated guard without rendering content first.
  return <>{children}</>;
};

export const RouteGuard: FC<RouteGuardProps> = ({ children, allowedRoles, requiredPermissions }) => {
  const { isAuthenticated, hasAnyRole, hasPermission } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    // Redirect to login page, saving the original location
    return <Navigate to="/login" state={{ from: `${location.pathname}${location.search}${location.hash}` }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0 && !hasAnyRole(allowedRoles)) {
    // If authenticated but role not allowed, redirect to home or access denied page
    return <Navigate to="/403" replace />;
  }

  if (requiredPermissions?.some((permission) => !hasPermission(permission))) {
    return <Navigate to="/403" replace />;
  }

  return <>{children}</>;
};
