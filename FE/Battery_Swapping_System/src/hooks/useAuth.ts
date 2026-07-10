import { useAuthStore } from '../store/authStore';
import { UserRole } from '../constants/roles';

export const useAuth = () => {
  const { user, token, isAuthenticated, login, logout, updateUser } = useAuthStore();

  const isRole = (role: UserRole) => {
    return user?.role === role;
  };

  const hasAnyRole = (roles: UserRole[]) => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  return {
    user,
    token,
    isAuthenticated,
    isRole,
    hasAnyRole,
    login,
    logout,
    updateUser,
    isAdmin: isRole(UserRole.ADMIN),
    isManager: isRole(UserRole.MANAGER),
    isTechnician: isRole(UserRole.TECHNICIAN),
    isStaff: isRole(UserRole.STAFF),
    isMember: isRole(UserRole.MEMBER),
  };
};
