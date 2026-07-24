import { useCallback, useEffect, useState, type FC } from 'react';
import { useParams } from 'react-router-dom';
import { AlertCircle, Loader2, Pencil, UserPlus, Users } from 'lucide-react';
import { Badge } from '../../../../../../components/ui/Badge';
import { Button } from '../../../../../../components/ui/Button';
import { Modal } from '../../../../../../components/ui/Modal';
import { getApiErrorMessage } from '../../../../../../services/apiClient';
import { stationAssignmentService, type StationAssignment } from '../../../../../../services/stationDetailService';

type Candidate = { id: string; fullName: string; email: string; role: { name: 'STAFF' } };
type ShiftId = 'Sáng' | 'Chiều' | 'Tối';

const shiftOptions: Array<{ id: ShiftId; label: string }> = [
  { id: 'Sáng', label: 'Buổi sáng (08:00 - 12:00)' },
  { id: 'Chiều', label: 'Buổi chiều (12:00 - 18:00)' },
  { id: 'Tối', label: 'Buổi tối (18:00 - 22:00)' },
];

const serializeShifts = (shifts: ShiftId[]) => {
  const ordered = shiftOptions.map((option) => option.id).filter((shift) => shifts.includes(shift));
  return ordered.length === 0 || ordered.length === shiftOptions.length ? 'Tất cả các buổi' : ordered.join(', ');
};

const parseShifts = (value?: string | null): ShiftId[] => {
  if (!value || value === 'Tất cả các buổi') return shiftOptions.map((option) => option.id);
  return shiftOptions.map((option) => option.id).filter((shift) => value.includes(shift));
};

const ShiftPicker = ({ value, onChange }: { value: ShiftId[]; onChange: (value: ShiftId[]) => void }) => (
  <fieldset>
    <legend className="mb-2 text-sm font-bold text-slate-700 dark:text-slate-300">Ca làm việc</legend>
    <div className="space-y-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
      {shiftOptions.map((option) => (
        <label key={option.id} className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            checked={value.includes(option.id)}
            onChange={(event) => onChange(event.target.checked
              ? [...value, option.id]
              : value.filter((shift) => shift !== option.id))}
          />
          {option.label}
        </label>
      ))}
    </div>
    <p className="mt-2 text-xs text-slate-500">Không chọn hoặc chọn cả ba ca sẽ được lưu là “Tất cả các buổi”.</p>
  </fieldset>
);

export const StationStaff: FC = () => {
  const { stationId = '' } = useParams();
  const [items, setItems] = useState<StationAssignment[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [userId, setUserId] = useState('');
  const [shifts, setShifts] = useState<ShiftId[]>([]);
  const [editing, setEditing] = useState<StationAssignment | null>(null);
  const [editingShifts, setEditingShifts] = useState<ShiftId[]>([]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [assigned, people] = await Promise.all([
        stationAssignmentService.list(stationId),
        stationAssignmentService.candidates(stationId),
      ]);
      setItems(assigned.filter((item) => item.assignmentRole === 'STAFF'));
      setCandidates(people.filter((person: Candidate) => person.role.name === 'STAFF'));
    } catch (cause) {
      setError(getApiErrorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, [stationId]);

  useEffect(() => { void load(); }, [load]);

  const createAssignment = async () => {
    if (!userId) {
      setError('Vui lòng chọn nhân viên.');
      return;
    }
    try {
      setBusy(true);
      setError('');
      setSuccess('');
      await stationAssignmentService.create(stationId, {
        userId,
        assignmentRole: 'STAFF',
        shift: serializeShifts(shifts),
      });
      setSuccess('Đã phân công trạm và ca làm cho nhân viên.');
      setCreateOpen(false);
      setUserId('');
      setShifts([]);
      await load();
    } catch (cause) {
      setError(getApiErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  const update = async (item: StationAssignment, data: Record<string, unknown>, message: string) => {
    try {
      setBusy(true);
      setError('');
      setSuccess('');
      await stationAssignmentService.update(stationId, item.id, data);
      setSuccess(message);
      await load();
    } catch (cause) {
      setError(getApiErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  const saveShift = async () => {
    if (!editing) return;
    await update(editing, { shift: serializeShifts(editingShifts) }, 'Đã cập nhật ca làm việc.');
    setEditing(null);
  };

  const remove = async (item: StationAssignment) => {
    if (!window.confirm(`Xóa phân công của ${item.user.fullName}?`)) return;
    try {
      setBusy(true);
      setError('');
      setSuccess('');
      await stationAssignmentService.remove(stationId, item.id);
      setSuccess('Đã xóa phân công.');
      await load();
    } catch (cause) {
      setError(getApiErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  const openShiftEditor = (item: StationAssignment) => {
    setEditing(item);
    setEditingShifts(parseShifts(item.shift));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white">Phân công nhân sự</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Quản lý nhân viên trạm và ca làm việc.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <UserPlus className="h-4 w-4" />
          Phân công nhân viên
        </Button>
      </div>

      {error && (
        <div role="alert" className="flex items-center gap-2 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm font-semibold text-rose-600 dark:text-rose-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div role="status" className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
          {success}
        </div>
      )}

      {loading ? (
        <div className="grid min-h-64 place-items-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      ) : items.length ? (
        <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full min-w-[840px] text-left text-sm">
            <thead className="bg-slate-100 text-xs font-extrabold uppercase text-slate-600 dark:bg-slate-800/80 dark:text-slate-300">
              <tr>
                {['Nhân viên', 'Ca làm việc', 'Trạng thái', 'Ngày bắt đầu', 'Ngày kết thúc', 'Hành động'].map((label) => (
                  <th className="p-3.5" key={label}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 text-slate-800 dark:divide-slate-800 dark:text-slate-200">
              {items.map((item) => (
                <tr className="transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/30" key={item.id}>
                  <td className="p-3.5">
                    <div className="flex items-center gap-2">
                      <strong className="text-slate-900 dark:text-white">{item.user.fullName}</strong>
                      <Badge variant="success">Nhân viên trạm</Badge>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {item.user.email}{item.user.phone ? ` · ${item.user.phone}` : ''}
                    </div>
                  </td>
                  <td className="p-3.5">
                    <div className="flex items-center gap-2">
                      <span>{item.shift || 'Chưa đặt ca'}</span>
                      <button type="button" aria-label={`Sửa ca của ${item.user.fullName}`}
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:hover:bg-slate-800"
                        onClick={() => openShiftEditor(item)}>
                        <Pencil className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                  <td className="p-3.5">
                    <Badge variant={item.active ? 'success' : 'gray'}>{item.active ? 'Đang hoạt động' : 'Đã kết thúc'}</Badge>
                  </td>
                  <td className="p-3.5">{new Date(item.effectiveFrom).toLocaleDateString('vi-VN')}</td>
                  <td className="p-3.5">{item.effectiveTo ? new Date(item.effectiveTo).toLocaleDateString('vi-VN') : 'Chưa có'}</td>
                  <td className="p-3.5">
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" disabled={busy}
                        onClick={() => void update(item, { active: !item.active }, item.active ? 'Đã kết thúc phân công.' : 'Đã kích hoạt phân công.')}>
                        {item.active ? 'Kết thúc' : 'Kích hoạt'}
                      </Button>
                      <Button size="sm" variant="danger" disabled={busy} onClick={() => void remove(item)}>Xóa</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="app-panel flex flex-col items-center justify-center border-dashed p-12 text-center">
          <Users className="h-10 w-10 text-slate-400" />
          <h3 className="mt-3 text-lg font-bold text-slate-900 dark:text-white">Trạm chưa được phân công nhân viên</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Chọn “Phân công nhân viên” để thêm staff vào trạm.</p>
        </div>
      )}

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Phân công nhân viên"
        footer={<>
          <Button variant="outline" onClick={() => setCreateOpen(false)}>Hủy</Button>
          <Button loading={busy} disabled={!userId} onClick={() => void createAssignment()}>Lưu phân công</Button>
        </>}>
        <div className="space-y-4">
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
            Nhân viên
            <select className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              value={userId} onChange={(event) => setUserId(event.target.value)}>
              <option value="">Chọn nhân viên</option>
              {candidates.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>{candidate.fullName} · {candidate.email}</option>
              ))}
            </select>
          </label>
          <ShiftPicker value={shifts} onChange={setShifts} />
        </div>
      </Modal>

      <Modal isOpen={Boolean(editing)} onClose={() => setEditing(null)} title={`Cập nhật ca làm${editing ? ` · ${editing.user.fullName}` : ''}`}
        footer={<>
          <Button variant="outline" onClick={() => setEditing(null)}>Hủy</Button>
          <Button loading={busy} onClick={() => void saveShift()}>Lưu ca làm</Button>
        </>}>
        <ShiftPicker value={editingShifts} onChange={setEditingShifts} />
      </Modal>
    </div>
  );
};
