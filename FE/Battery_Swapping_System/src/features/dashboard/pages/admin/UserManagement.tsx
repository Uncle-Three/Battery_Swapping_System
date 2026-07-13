import { useEffect, useMemo, useState, type FC } from 'react';
import { Search, Users } from 'lucide-react';
import { Badge } from '../../../../components/ui/Badge';
import { Table } from '../../../../components/ui/Table';
import { Permissions } from '../../../../constants/permissions';
import { UserRole } from '../../../../constants/roles';
import { useAuth } from '../../../../hooks/useAuth';
import { adminService } from '../../../../services/adminService';
import type { PermissionMatrix, User, UserStatus } from '../../../../types';
import { roleLabel, statusLabel } from '../../../../utils/viLabels';

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
        setError('Không thể tải dữ liệu người dùng.');
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
      setError('Không thể cập nhật vai trò. Không được hạ quyền quản trị viên cuối cùng hoặc tự hạ quyền.');
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
      setError('Không thể cập nhật trạng thái. Không được tự khóa tài khoản hoặc khóa quản trị viên cuối cùng.');
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
              Quản lý người dùng hệ thống
            </h2>
            <p className="text-sm text-slate-550 dark:text-slate-400 mt-0.5">
              Vai trò và trạng thái được cập nhật trực tiếp trên hệ thống.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-850 rounded-2xl p-4 shadow-sm flex flex-col gap-3">
        <div className="relative w-full sm:max-w-xs">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            className="w-full pl-9 pr-4 py-2 border border-slate-250 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Tìm theo họ tên hoặc email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {permissionMatrix && (
          <p className="text-xs text-slate-500">
            Đã tải ma trận quyền cho {Object.keys(permissionMatrix).length} vai trò.
          </p>
        )}
        {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
      </div>

      {loading ? (
        <div className="text-sm text-slate-500">Đang tải người dùng...</div>
      ) : (
        <Table headers={['Mã', 'Họ tên', 'Email', 'Vai trò', 'Trạng thái', 'Số dư', 'Ngày tạo', 'Cập nhật']}>
          {filteredUsers.map((user) => (
            <tr key={user.id} className="hover:bg-slate-55 dark:hover:bg-slate-800/40 transition-colors">
              <td className="px-6 py-4 font-mono text-xs">{user.id}</td>
              <td className="px-6 py-4 font-bold text-slate-850 dark:text-slate-100">{user.name}</td>
              <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{user.email}</td>
              <td className="px-6 py-4">
                <Badge variant={getRoleBadgeVariant(user.role)}>{roleLabel(user.role)}</Badge>
              </td>
              <td className="px-6 py-4">
                <Badge variant={user.status === 'ACTIVE' ? 'success' : user.status === 'BLOCKED' ? 'error' : 'gray'}>
                  {statusLabel(user.status)}
                </Badge>
              </td>
              <td className="px-6 py-4 text-slate-500">{user.balance ?? '—'}</td>
              <td className="px-6 py-4 text-slate-500">{new Date(user.createdAt).toLocaleString('vi-VN')}</td>
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
                        {roleLabel(role)}
                      </option>
                    ))}
                  </select>
                  <select
                    className="bg-white dark:bg-slate-800 border border-slate-350 dark:border-slate-700 rounded-lg text-xs font-semibold px-2 py-1 text-slate-800 dark:text-slate-200"
                    value={user.status}
                    disabled={!canUpdateStatus || savingUserId === user.id}
                    onChange={(e) => handleStatusChange(user.id, e.target.value as UserStatus)}
                  >
                    {userStatuses.map((status) => (
                      <option key={status} value={status}>
                        {statusLabel(status)}
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
