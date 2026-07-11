import { useEffect, useMemo, useState, type FC } from 'react';
import { Search, UserPlus, Users } from 'lucide-react';
import { Badge } from '../../../../components/ui/Badge';
import { Button } from '../../../../components/ui/Button';
import { Table } from '../../../../components/ui/Table';
import { Permissions } from '../../../../constants/permissions';
import { UserRole } from '../../../../constants/roles';
import { useAuth } from '../../../../hooks/useAuth';
import { adminService } from '../../../../services/adminService';
import type { PermissionMatrix, User, UserStatus } from '../../../../types';

const userStatuses: UserStatus[] = ['ACTIVE', 'INACTIVE', 'BLOCKED'];

export const UserManagement: FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [permissionMatrix, setPermissionMatrix] = useState<PermissionMatrix | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const { hasPermission } = useAuth();

  const canUpdateRole = hasPermission(Permissions.USERS_UPDATE_ROLE);
  const canUpdateStatus = hasPermission(Permissions.USERS_UPDATE_STATUS);

  useEffect(() => {
    const load = async () => {
      try {
        const [userData, roleData, permissions] = await Promise.all([
          adminService.getUsers(),
          adminService.getRoles(),
          adminService.getPermissions(),
        ]);
        setUsers(userData);
        setRoles(roleData);
        setPermissionMatrix(permissions);
      } catch {
        setError('Khong the tai du lieu nguoi dung.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    setSavingUserId(userId);
    setError('');
    try {
      const updatedUser = await adminService.updateUserRole(userId, newRole);
      setUsers((current) => current.map((user) => (user.id === userId ? updatedUser : user)));
    } catch {
      setError('Khong the cap nhat role. Kiem tra last-admin/self-demote rule.');
    } finally {
      setSavingUserId(null);
    }
  };

  const handleStatusChange = async (userId: string, newStatus: UserStatus) => {
    setSavingUserId(userId);
    setError('');
    try {
      const updatedUser = await adminService.updateUserStatus(userId, newStatus);
      setUsers((current) => current.map((user) => (user.id === userId ? updatedUser : user)));
    } catch {
      setError('Khong the cap nhat status. Kiem tra self-block/last-admin rule.');
    } finally {
      setSavingUserId(null);
    }
  };

  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return 'error';
      case UserRole.MANAGER:
        return 'warning';
      case UserRole.TECHNICIAN:
        return 'info';
      case UserRole.STAFF:
        return 'success';
      default:
        return 'gray';
    }
  };

  const filteredUsers = useMemo(
    () =>
      users.filter(
        (user) =>
          user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    [searchTerm, users],
  );

  return (
    <div className="flex flex-col gap-6 text-left max-w-6xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-500 rounded-lg">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              Quan ly nguoi dung he thong
            </h2>
            <p className="text-sm text-slate-550 dark:text-slate-400 mt-0.5">
              Role/status duoc cap nhat truc tiep qua Backend Phase 1.
            </p>
          </div>
        </div>
        <Button variant="primary" className="flex items-center gap-2" disabled>
          <UserPlus className="h-4 w-4" />
          <span>Them User</span>
        </Button>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-850 rounded-2xl p-4 shadow-sm flex flex-col gap-3">
        <div className="relative w-full sm:max-w-xs">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            className="w-full pl-9 pr-4 py-2 border border-slate-250 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Tim theo ho ten hoac email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {permissionMatrix && (
          <p className="text-xs text-slate-500">
            Permission matrix loaded: ADMIN={permissionMatrix.ADMIN?.join(', ') ?? '*'}
          </p>
        )}
        {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
      </div>

      {loading ? (
        <div className="text-sm text-slate-500">Dang tai users...</div>
      ) : (
        <Table headers={['ID', 'Ho ten', 'Email', 'Role', 'Status', 'Balance', 'Ngay tao', 'Cap nhat']}>
          {filteredUsers.map((user) => (
            <tr key={user.id} className="hover:bg-slate-55 dark:hover:bg-slate-800/40 transition-colors">
              <td className="px-6 py-4 font-mono text-xs">{user.id}</td>
              <td className="px-6 py-4 font-bold text-slate-850 dark:text-slate-100">{user.name}</td>
              <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{user.email}</td>
              <td className="px-6 py-4">
                <Badge variant={getRoleBadgeVariant(user.role)}>{user.role}</Badge>
              </td>
              <td className="px-6 py-4">
                <Badge variant={user.status === 'ACTIVE' ? 'success' : user.status === 'BLOCKED' ? 'error' : 'gray'}>
                  {user.status ?? 'ACTIVE'}
                </Badge>
              </td>
              <td className="px-6 py-4 text-slate-500">{user.balance ?? '0'}</td>
              <td className="px-6 py-4 text-slate-500">{user.createdAt}</td>
              <td className="px-6 py-4">
                <div className="flex flex-col gap-2">
                  <select
                    className="bg-white dark:bg-slate-800 border border-slate-350 dark:border-slate-700 rounded-lg text-xs font-semibold px-2 py-1 text-slate-800 dark:text-slate-200"
                    value={user.role}
                    disabled={!canUpdateRole || savingUserId === user.id}
                    onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                  >
                    {roles.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                  <select
                    className="bg-white dark:bg-slate-800 border border-slate-350 dark:border-slate-700 rounded-lg text-xs font-semibold px-2 py-1 text-slate-800 dark:text-slate-200"
                    value={user.status ?? 'ACTIVE'}
                    disabled={!canUpdateStatus || savingUserId === user.id}
                    onChange={(e) => handleStatusChange(user.id, e.target.value as UserStatus)}
                  >
                    {userStatuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              </td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
};

export default UserManagement;
