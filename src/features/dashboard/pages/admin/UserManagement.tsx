import { useState, type FC } from 'react';
import { Table } from '../../../../components/ui/Table';
import { Badge } from '../../../../components/ui/Badge';
import { Button } from '../../../../components/ui/Button';
import { Users, UserPlus } from 'lucide-react';
import { UserRole } from '../../../../constants/roles';
import type { User } from '../../../../types';

export const UserManagement: FC = () => {
  // Mock users database
  const [users, setUsers] = useState<User[]>([
    { id: 'u-1', name: 'Nguyễn Tuấn Anh', email: 'tuananh@gmail.com', role: UserRole.MEMBER, createdAt: '2026-05-12' },
    { id: 'u-2', name: 'Đỗ Minh Phú', email: 'minhphu@gmail.com', role: UserRole.ADMIN, createdAt: '2026-01-10' },
    { id: 'u-3', name: 'Trần Văn Hoàng', email: 'hoang.tran@company.com', role: UserRole.STAFF, createdAt: '2026-04-20' },
    { id: 'u-4', name: 'Phạm Minh Đức', email: 'duc.pham@company.com', role: UserRole.TECHNICIAN, createdAt: '2026-03-15' },
    { id: 'u-5', name: 'Lê Thị Thu', email: 'thu.le@company.com', role: UserRole.MANAGER, createdAt: '2026-02-18' },
  ]);

  const handleRoleChange = (userId: string, newRole: UserRole) => {
    setUsers(users.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
  };

  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN: return 'error';
      case UserRole.MANAGER: return 'warning';
      case UserRole.TECHNICIAN: return 'info';
      case UserRole.STAFF: return 'success';
      default: return 'gray';
    }
  };

  return (
    <div className="flex flex-col gap-6 text-left max-w-5xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-500 rounded-lg">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              Quản lý người dùng hệ thống
            </h2>
            <p className="text-sm text-slate-550 dark:text-slate-400 mt-0.5">
              Phân quyền vai trò hoạt động (Roles) và theo dõi tài khoản khách hàng / vận hành viên.
            </p>
          </div>
        </div>
        <Button variant="primary" className="flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          <span>Thêm User</span>
        </Button>
      </div>

      <Table headers={['ID', 'Họ tên', 'Email', 'Vai trò (Role)', 'Ngày tạo', 'Thao tác nâng quyền']}>
        {users.map((u) => (
          <tr key={u.id} className="hover:bg-slate-55 dark:hover:bg-slate-800/40 transition-colors">
            <td className="px-6 py-4 font-mono text-xs">{u.id}</td>
            <td className="px-6 py-4 font-bold text-slate-850 dark:text-slate-100">{u.name}</td>
            <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{u.email}</td>
            <td className="px-6 py-4">
              <Badge variant={getRoleBadgeVariant(u.role)}>
                {u.role}
              </Badge>
            </td>
            <td className="px-6 py-4 text-slate-500">{u.createdAt}</td>
            <td className="px-6 py-4 flex gap-2">
              <select
                className="bg-white dark:bg-slate-800 border border-slate-350 dark:border-slate-700 rounded-lg text-xs font-semibold px-2 py-1 text-slate-800 dark:text-slate-200"
                value={u.role}
                onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
              >
                <option value={UserRole.MEMBER}>MEMBER</option>
                <option value={UserRole.STAFF}>STAFF</option>
                <option value={UserRole.TECHNICIAN}>TECHNICIAN</option>
                <option value={UserRole.MANAGER}>MANAGER</option>
                <option value={UserRole.ADMIN}>ADMIN</option>
              </select>
            </td>
          </tr>
        ))}
      </Table>
    </div>
  );
};
