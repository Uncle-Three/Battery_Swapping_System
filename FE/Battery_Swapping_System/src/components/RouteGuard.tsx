import { type ReactNode, type FC } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { type UserRole } from '../constants/roles';
import type { Permission } from '../constants/permissions';

interface RouteGuardProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
  requiredPermissions?: Permission[];
}

export const RouteGuard: FC<RouteGuardProps> = ({ children, allowedRoles, requiredPermissions }) => {
  const { isAuthenticated, hasAnyRole, hasPermission } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    // Redirect to login page, saving the original location
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0 && !hasAnyRole(allowedRoles)) {
    // If authenticated but role not allowed, redirect to home or access denied page
    return <Navigate to="/unauthorized" replace />;
  }

  if (requiredPermissions?.some((permission) => !hasPermission(permission))) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};
