import { useCallback, useEffect, useState, type FC } from 'react';
import { useParams } from 'react-router-dom';
import { AlertCircle, Loader2, UserPlus, Users } from 'lucide-react';
import { Badge } from '../../../../../../components/ui/Badge';
import { Button } from '../../../../../../components/ui/Button';
import { Modal } from '../../../../../../components/ui/Modal';
import { getApiErrorMessage } from '../../../../../../services/apiClient';
import { stationAssignmentService, type StationAssignment } from '../../../../../../services/stationDetailService';

type Candidate = { id: string; fullName: string; email: string; role: { name: 'MANAGER' | 'STAFF' | 'TECHNICIAN' } };

export const StationStaff: FC = () => {
  const { stationId = '' } = useParams();
  const [items, setItems] = useState<StationAssignment[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState('');
  const [shift, setShift] = useState('Ca sáng');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [assigned, people] = await Promise.all([
        stationAssignmentService.list(stationId),
        stationAssignmentService.candidates(stationId),
      ]);
      setItems(assigned);
      setCandidates(people);
    } catch (cause) {
      setError(getApiErrorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, [stationId]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async () => {
    const person = candidates.find((x) => x.id === userId);
    if (!person) return setError('Vui lòng chọn nhân sự.');
    try {
      setBusy(true);
      setError('');
      await stationAssignmentService.create(stationId, { userId, assignmentRole: person.role.name, shift });
      setSuccess('Đã phân công nhân sự và lưu vào hệ thống.');
      setOpen(false);
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
      await stationAssignmentService.update(stationId, item.id, data);
      setSuccess(message);
      await load();
    } catch (cause) {
      setError(getApiErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (item: StationAssignment) => {
    if (!window.confirm(`Xóa phân công của ${item.user.fullName}?`)) return;
    try {
      setBusy(true);
      setError('');
      await stationAssignmentService.remove(stationId, item.id);
      setSuccess('Đã xóa phân công.');
      await load();
    } catch (cause) {
      setError(getApiErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white">Nhân sự & Phân công</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Quản lý quản lý trạm, nhân viên, kỹ thuật viên và ca làm việc.</p>
        </div>
        <Button className="inline-flex items-center gap-2" onClick={() => setOpen(true)}>
          <UserPlus className="h-4 w-4" />
          <span>Phân công</span>
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
          <table className="min-w-[900px] w-full text-left text-sm">
            <thead className="bg-slate-100 text-xs font-extrabold uppercase text-slate-600 dark:bg-slate-800/80 dark:text-slate-300">
              <tr>
                {['Nhân sự', 'Vai trò', 'Ca làm việc', 'Trạng thái', 'Ngày bắt đầu', 'Ngày kết thúc', 'Hành động'].map((x) => (
                  <th className="p-3.5" key={x}>
                    {x}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
              {items.map((item) => (
                <tr className="transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/30" key={item.id}>
                  <td className="p-3.5">
                    <strong className="text-slate-900 dark:text-white">{item.user.fullName}</strong>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {item.user.email} · {item.user.phone || 'Chưa có SĐT'}
                    </div>
                  </td>
                  <td className="p-3.5">
                    <Badge variant={item.assignmentRole === 'MANAGER' ? 'info' : 'gray'}>{item.assignmentRole}</Badge>
                  </td>
                  <td className="p-3.5">
                    <input
                      aria-label={`Ca của ${item.user.fullName}`}
                      className="w-28 rounded-xl border border-slate-200 bg-white p-2 text-sm font-semibold text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                      defaultValue={item.shift || ''}
                      onBlur={(e) => {
                        if (e.target.value !== (item.shift || '')) void update(item, { shift: e.target.value }, 'Đã cập nhật ca làm việc.');
                      }}
                    />
                  </td>
                  <td className="p-3.5">
                    <Badge variant={item.active ? 'success' : 'error'}>{item.active ? 'Đang hoạt động' : 'Đã dừng'}</Badge>
                  </td>
                  <td className="p-3.5">{new Date(item.effectiveFrom).toLocaleDateString('vi-VN')}</td>
                  <td className="p-3.5">{item.effectiveTo ? new Date(item.effectiveTo).toLocaleDateString('vi-VN') : '—'}</td>
                  <td className="p-3.5">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => void update(item, { active: !item.active }, item.active ? 'Đã ngừng phân công.' : 'Đã kích hoạt phân công.')}
                      >
                        {item.active ? 'Ngừng' : 'Kích hoạt'}
                      </Button>
                      <Button size="sm" variant="danger" disabled={busy} onClick={() => void remove(item)}>
                        Xóa
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="app-panel flex flex-col items-center justify-center p-12 text-center border-dashed">
          <Users className="h-10 w-10 text-slate-400" />
          <h3 className="mt-3 text-lg font-bold text-slate-900 dark:text-white">Trạm chưa được phân công nhân sự</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Bấm nút "Phân công" ở trên để gán nhân sự cho trạm dịch vụ.</p>
        </div>
      )}

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Phân công nhân sự"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Hủy
            </Button>
            <Button loading={busy} disabled={!userId} onClick={() => void submit()}>
              Lưu phân công
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
            Nhân sự
            <select
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            >
              <option value="">Chọn nhân sự</option>
              {candidates.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.fullName} · {x.role.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
            Ca làm việc
            <input
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              value={shift}
              onChange={(e) => setShift(e.target.value)}
              maxLength={100}
            />
          </label>
        </div>
      </Modal>
    </div>
  );
};
