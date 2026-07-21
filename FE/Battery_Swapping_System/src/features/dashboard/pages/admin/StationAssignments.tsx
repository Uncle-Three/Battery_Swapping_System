import { useEffect, useMemo, useState, type FC, type FormEvent } from 'react';
import { Lightbulb, Plus, Trash2, UserCheck } from 'lucide-react';
import { Table } from '../../../../components/ui/Table';
import { Button } from '../../../../components/ui/Button';
import { Badge } from '../../../../components/ui/Badge';
import { Modal } from '../../../../components/ui/Modal';
import { adminService } from '../../../../services/adminService';
import { getApiErrorMessage } from '../../../../services/apiClient';
import type { Station, User } from '../../../../types';

type AssignmentRole = 'STAFF' | 'TECHNICIAN' | 'MANAGER';
type Assignment = { id: string; userId: string; stationId: string; assignmentRole: AssignmentRole; shift?: string | null; active: boolean; effectiveFrom: string; effectiveTo?: string | null; user: { id: string; fullName: string; email: string }; station: { id: string; name: string } };
const roleLabel: Record<AssignmentRole, string> = { STAFF: 'Nhân viên trạm', TECHNICIAN: 'Kỹ thuật viên', MANAGER: 'Quản lý trạm' };

export const StationAssignments: FC = () => {
  const [assignments, setAssignments] = useState<Assignment[]>([]); const [users, setUsers] = useState<User[]>([]); const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState(''); const [success, setSuccess] = useState('');
  const [userId, setUserId] = useState(''); const [stationId, setStationId] = useState(''); const [shift, setShift] = useState('Ca sáng'); const [removeTarget, setRemoveTarget] = useState<Assignment | null>(null);

  const loadData = async () => {
    try {
      setLoading(true); setError('');
      const [assignmentRows, userRows, stationRows] = await Promise.all([adminService.getStationAssignments(), adminService.getUsers(), adminService.getStations()]);
      setAssignments(assignmentRows); setUsers(userRows.filter((user) => ['STAFF', 'TECHNICIAN', 'MANAGER'].includes(user.role))); setStations(stationRows.filter((station) => station.status === 'ACTIVE'));
    } catch (cause) { setError(getApiErrorMessage(cause)); } finally { setLoading(false); }
  };
  useEffect(() => { void loadData(); }, []);

  const selectedUser = users.find((user) => user.id === userId); const assignmentRole = selectedUser?.role as AssignmentRole | undefined;
  const recommendedStation = useMemo(() => {
    if (!assignmentRole || !stations.length) return undefined;
    return [...stations].sort((left, right) => {
      const count = (id: string) => assignments.filter((item) => item.active && item.stationId === id && item.assignmentRole === assignmentRole).length;
      return count(left.id) - count(right.id) || left.name.localeCompare(right.name, 'vi');
    })[0];
  }, [assignmentRole, assignments, stations]);

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault(); if (!assignmentRole || !userId || !stationId) return;
    try { setSaving(true); setError(''); setSuccess(''); await adminService.createStationAssignment({ userId, stationId, assignmentRole, shift }); setSuccess('Đã phân công nhân sự vào trạm và lưu trên hệ thống.'); setUserId(''); setStationId(''); await loadData(); }
    catch (cause) { setError(getApiErrorMessage(cause)); } finally { setSaving(false); }
  };
  const handleDelete = async () => {
    if (!removeTarget) return;
    try { setSaving(true); setError(''); await adminService.deleteStationAssignment(removeTarget.id); setSuccess('Đã kết thúc phân công.'); setRemoveTarget(null); await loadData(); }
    catch (cause) { setError(getApiErrorMessage(cause)); } finally { setSaving(false); }
  };

  return <div className="flex w-full flex-col gap-6 text-left">
    <header className="flex items-center gap-3"><div className="rounded-xl bg-blue-50 p-3 text-blue-600"><UserCheck className="h-6 w-6" /></div><div><h1 className="text-2xl font-black">Phân công nhân sự tại trạm</h1><p className="text-sm text-slate-500">Phân công đúng vai trò, ca làm và trạm để nhân viên truy cập quy trình thay pin.</p></div></header>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</p>}{success && <p role="status" className="rounded-xl bg-green-50 p-4 text-sm font-semibold text-green-700">{success}</p>}
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <form onSubmit={handleCreate} className="h-fit space-y-4 rounded-2xl border bg-white p-5 dark:bg-slate-900"><h2 className="font-black">Thêm phân công mới</h2>
        <label className="block text-sm font-semibold">Nhân sự<select aria-label="Nhân sự" className="mt-1 w-full rounded-xl border p-3 dark:bg-slate-950" value={userId} onChange={(event) => { setUserId(event.target.value); setStationId(''); }} required><option value="">Chọn nhân sự</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name} · {roleLabel[user.role as AssignmentRole]}</option>)}</select></label>
        {assignmentRole && <div className="rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-950"><span className="text-slate-500">Vai trò phân công</span><strong className="mt-1 block">{roleLabel[assignmentRole]}</strong></div>}
        <label className="block text-sm font-semibold">Trạm đổi pin<select aria-label="Trạm đổi pin" className="mt-1 w-full rounded-xl border p-3 dark:bg-slate-950" value={stationId} onChange={(event) => setStationId(event.target.value)} required><option value="">Chọn trạm</option>{stations.map((station) => <option key={station.id} value={station.id}>{station.name}</option>)}</select></label>
        {recommendedStation && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><div className="flex items-center gap-2 font-bold"><Lightbulb className="h-4 w-4" />Gợi ý phân công</div><p className="mt-1">{recommendedStation.name} đang có ít {roleLabel[assignmentRole!].toLowerCase()} nhất.</p><button type="button" className="mt-2 font-bold text-blue-700" onClick={() => setStationId(recommendedStation.id)}>Áp dụng gợi ý</button></div>}
        <label className="block text-sm font-semibold">Ca làm<select aria-label="Ca làm" className="mt-1 w-full rounded-xl border p-3 dark:bg-slate-950" value={shift} onChange={(event) => setShift(event.target.value)}><option>Ca sáng</option><option>Ca chiều</option><option>Ca tối</option><option>Cả ngày</option></select></label>
        <Button type="submit" loading={saving} disabled={!userId || !stationId || !assignmentRole} className="w-full justify-center"><Plus className="h-4 w-4" />Thêm phân công</Button>
      </form>
      <section>{loading && !assignments.length ? <div className="rounded-2xl border bg-white p-10 text-center text-slate-500">Đang tải dữ liệu...</div> : <Table headers={['Nhân sự', 'Vai trò', 'Trạm phụ trách', 'Ca làm', 'Trạng thái', 'Hành động']}>{!assignments.length && <tr><td colSpan={6} className="p-8 text-center text-slate-500">Chưa có phân công hợp lệ.</td></tr>}{assignments.map((assignment) => <tr key={assignment.id}><td className="px-6 py-4"><strong>{assignment.user.fullName}</strong><div className="text-xs text-slate-500">{assignment.user.email}</div></td><td className="px-6 py-4"><Badge variant={assignment.assignmentRole === 'STAFF' ? 'success' : assignment.assignmentRole === 'TECHNICIAN' ? 'info' : 'warning'}>{roleLabel[assignment.assignmentRole]}</Badge></td><td className="px-6 py-4 font-semibold">{assignment.station.name}</td><td className="px-6 py-4">{assignment.shift || 'Chưa đặt ca'}</td><td className="px-6 py-4"><Badge variant={assignment.active ? 'success' : 'gray'}>{assignment.active ? 'Đang hoạt động' : 'Đã kết thúc'}</Badge></td><td className="px-6 py-4"><Button size="sm" variant="secondary" aria-label={`Kết thúc phân công ${assignment.user.fullName}`} onClick={() => setRemoveTarget(assignment)} disabled={!assignment.active}><Trash2 className="h-4 w-4 text-red-600" /></Button></td></tr>)}</Table>}</section>
    </div>
    <Modal isOpen={Boolean(removeTarget)} onClose={() => setRemoveTarget(null)} title="Kết thúc phân công" footer={<><Button variant="outline" onClick={() => setRemoveTarget(null)}>Hủy</Button><Button variant="danger" loading={saving} onClick={() => void handleDelete()}>Xác nhận</Button></>}><p>Bạn có chắc muốn kết thúc phân công của <strong>{removeTarget?.user.fullName}</strong> tại <strong>{removeTarget?.station.name}</strong>?</p></Modal>
  </div>;
};

export default StationAssignments;
