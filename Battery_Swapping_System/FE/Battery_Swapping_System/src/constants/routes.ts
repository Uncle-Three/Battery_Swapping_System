import { UserRole, type UserRole as UserRoleType } from './roles';

export const roleDashboard = (role?: UserRoleType | null) => {
  switch (role) {
    case UserRole.MEMBER:
      return '/app/dashboard';
    case UserRole.MANAGER:
      return '/manager/dashboard';
    case UserRole.STAFF:
    case UserRole.TECHNICIAN:
      return '/staff/dashboard';
    case UserRole.ADMIN:
      return '/admin/dashboard';
    default:
      return '/login';
  }
};

