import { useEffect, useState, type FC, type FormEvent } from 'react';
import { Plus, Trash2, UserCheck } from 'lucide-react';
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
  const [userId, setUserId] = useState(''); const [stationId, setStationId] = useState(''); const [shifts, setShifts] = useState<string[]>([]); const [removeTarget, setRemoveTarget] = useState<Assignment | null>(null);

  const loadData = async () => {
    try {
      setLoading(true); setError('');
      const [assignmentRows, userRows, stationRows] = await Promise.all([adminService.getStationAssignments(), adminService.getUsers(), adminService.getStations()]);
      setAssignments(assignmentRows); setUsers(userRows.filter((user) => user.role === 'STAFF')); setStations(stationRows.filter((station) => station.status === 'ACTIVE'));
    } catch (cause) { setError(getApiErrorMessage(cause)); } finally { setLoading(false); }
  };
  useEffect(() => { void loadData(); }, []);

  const assignmentRole: AssignmentRole | undefined = userId ? 'STAFF' : undefined;

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault(); if (!assignmentRole || !userId || !stationId) return;
    const orderedShifts = ['Sáng', 'Chiều', 'Tối'].filter(s => shifts.includes(s));
    const shiftString = orderedShifts.length === 0 || orderedShifts.length === 3 ? 'Tất cả các buổi' : orderedShifts.join(', ');
    try { setSaving(true); setError(''); setSuccess(''); await adminService.createStationAssignment({ userId, stationId, assignmentRole, shift: shiftString }); setSuccess('Đã phân công trạm và ca làm cho nhân viên.'); setUserId(''); setStationId(''); setShifts([]); await loadData(); }
    catch (cause) { setError(getApiErrorMessage(cause)); } finally { setSaving(false); }
  };
  const handleDelete = async () => {
    if (!removeTarget) return;
    try { setSaving(true); setError(''); await adminService.deleteStationAssignment(removeTarget.id); setSuccess('Đã kết thúc phân công.'); setRemoveTarget(null); await loadData(); }
    catch (cause) { setError(getApiErrorMessage(cause)); } finally { setSaving(false); }
  };

  return <div className="flex w-full flex-col gap-6 text-left">
    <header className="flex items-center gap-3"><div className="rounded-xl bg-blue-50 p-3 text-blue-600"><UserCheck className="h-6 w-6" /></div><div><h1 className="text-2xl font-black">Phân công nhân viên tại trạm</h1><p className="text-sm text-slate-500">Chọn nhân viên, chọn trạm làm việc và giao ca phù hợp.</p></div></header>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</p>}{success && <p role="status" className="rounded-xl bg-green-50 p-4 text-sm font-semibold text-green-700">{success}</p>}
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <form onSubmit={handleCreate} className="h-fit space-y-4 rounded-2xl border bg-white p-5 dark:bg-slate-900"><h2 className="font-black">Thêm phân công mới</h2>
        <label className="block text-sm font-semibold">Nhân viên<select aria-label="Nhân viên" className="mt-1 w-full rounded-xl border p-3 dark:bg-slate-950" value={userId} onChange={(event) => { setUserId(event.target.value); setStationId(''); }} required><option value="">Chọn nhân viên trước</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name} · {user.email}</option>)}</select></label>
        <label className="block text-sm font-semibold">Trạm làm việc<select aria-label="Trạm làm việc" className="mt-1 w-full rounded-xl border p-3 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 dark:bg-slate-950 dark:disabled:bg-slate-900" value={stationId} onChange={(event) => setStationId(event.target.value)} disabled={!userId} required><option value="">{userId ? 'Chọn trạm' : 'Vui lòng chọn nhân viên trước'}</option>{stations.map((station) => <option key={station.id} value={station.id}>{station.name}</option>)}</select></label>
        <div className="block text-sm font-semibold">
          <p className="mb-2">Ca làm</p>
          <div className="flex flex-col gap-2">
            {[{ id: 'Sáng', label: 'Buổi sáng (08:00 - 12:00)' }, { id: 'Chiều', label: 'Buổi chiều (12:00 - 18:00)' }, { id: 'Tối', label: 'Buổi tối (18:00 - 22:00)' }].map(opt => (
              <label key={opt.id} className="flex items-center gap-2 font-normal cursor-pointer text-slate-700 dark:text-slate-300">
                <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" checked={shifts.includes(opt.id)} onChange={(e) => { if (e.target.checked) setShifts([...shifts, opt.id]); else setShifts(shifts.filter(s => s !== opt.id)); }} />
                {opt.label}
              </label>
            ))}
          </div>
        </div>
        <Button type="submit" loading={saving} disabled={!userId || !stationId || !assignmentRole} className="w-full justify-center"><Plus className="h-4 w-4" />Phân công</Button>
      </form>
      <section>{loading && !assignments.length ? <div className="rounded-2xl border bg-white p-10 text-center text-slate-500">Đang tải dữ liệu...</div> : <Table headers={['Nhân sự', 'Trạm phụ trách', 'Trạng thái', 'Hành động']}>{!assignments.length && <tr><td colSpan={4} className="p-8 text-center text-slate-500">Chưa có phân công hợp lệ.</td></tr>}{assignments.map((assignment) => <tr key={assignment.id}><td className="px-6 py-4"><div className="flex items-center gap-2"><strong>{assignment.user.fullName}</strong><Badge variant={assignment.assignmentRole === 'STAFF' ? 'success' : assignment.assignmentRole === 'TECHNICIAN' ? 'info' : 'warning'}>{roleLabel[assignment.assignmentRole]}</Badge></div><div className="mt-0.5 text-xs text-slate-500">{assignment.user.email}</div></td><td className="px-6 py-4"><div className="font-semibold text-slate-900 dark:text-white">{assignment.station.name}</div><div className="mt-0.5 text-xs text-slate-500">{assignment.shift || 'Chưa đặt ca'}</div></td><td className="px-6 py-4"><Badge variant={assignment.active ? 'success' : 'gray'}>{assignment.active ? 'Đang hoạt động' : 'Đã kết thúc'}</Badge></td><td className="px-6 py-4"><Button size="sm" variant="secondary" aria-label={`Kết thúc phân công ${assignment.user.fullName}`} onClick={() => setRemoveTarget(assignment)} disabled={!assignment.active}><Trash2 className="h-4 w-4 text-red-600" /></Button></td></tr>)}</Table>}</section>
    </div>
    <Modal isOpen={Boolean(removeTarget)} onClose={() => setRemoveTarget(null)} title="Kết thúc phân công" footer={<><Button variant="outline" onClick={() => setRemoveTarget(null)}>Hủy</Button><Button variant="danger" loading={saving} onClick={() => void handleDelete()}>Xác nhận</Button></>}><p>Bạn có chắc muốn kết thúc phân công của <strong>{removeTarget?.user.fullName}</strong> tại <strong>{removeTarget?.station.name}</strong>?</p></Modal>
  </div>;
};

export default StationAssignments;
