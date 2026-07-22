import { useCallback, useEffect, useState, type FC, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, CalendarPlus, Loader2, Plus, Trash2, Wrench, Warehouse, Calendar } from 'lucide-react';
import { Badge } from '../../../../../../components/ui/Badge';
import { Button } from '../../../../../../components/ui/Button';
import { Modal } from '../../../../../../components/ui/Modal';
import { getApiErrorMessage } from '../../../../../../services/apiClient';
import { bayService, slotService, type ReplacementSlot, type ServiceBay } from '../../../../../../services/stationDetailService';
import { stationStatusLabel } from '../stationStatusLabels';

const inputStyle = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none';
const today = new Date().toISOString().slice(0, 10);

const newSlot = () => ({
  bayId: '',
  date: today,
  startTime: '08:00',
  endTime: '08:30',
  capacity: 1,
  status: 'AVAILABLE' as ReplacementSlot['status'],
  occurrences: 1,
});

export const StationSlots: FC = () => {
  const { stationId = '' } = useParams();
  const navigate = useNavigate();
  const [bays, setBays] = useState<ServiceBay[]>([]);
  const [slots, setSlots] = useState<ReplacementSlot[]>([]);
  const [date, setDate] = useState(today);
  const [view, setView] = useState<'day' | 'week'>('day');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showBay, setShowBay] = useState(false);
  const [showSlot, setShowSlot] = useState(false);
  const [deleteBay, setDeleteBay] = useState<ServiceBay>();
  const [editing, setEditing] = useState<ReplacementSlot>();
  const [bayForm, setBayForm] = useState({ bayCode: '', bayName: '', status: 'AVAILABLE', defaultDurationMinutes: 30, description: '' });
  const [slotForm, setSlotForm] = useState(newSlot);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [b, s] = await Promise.all([bayService.list(stationId), slotService.list(stationId, { from: date, view })]);
      setBays(b);
      setSlots(s);
      setSlotForm((x) => ({ ...x, bayId: x.bayId || b[0]?.id || '' }));
    } catch (cause) {
      setError(getApiErrorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, [stationId, date, view]);

  useEffect(() => {
    void load();
  }, [load]);

  const submitBay = async (e: FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError('');
      await bayService.create(stationId, bayForm as any);
      setShowBay(false);
      setBayForm({ bayCode: '', bayName: '', status: 'AVAILABLE', defaultDurationMinutes: 30, description: '' });
      setSuccess('Đã tạo khoang thay pin.');
      await load();
    } catch (cause) {
      setError(getApiErrorMessage(cause));
    } finally {
      setSaving(false);
    }
  };

  const submitSlot = async (e: FormEvent) => {
    e.preventDefault();
    if (slotForm.startTime >= slotForm.endTime) return setError('Giờ bắt đầu phải sớm hơn giờ kết thúc.');
    try {
      setSaving(true);
      setError('');
      const { occurrences, ...payload } = slotForm;
      if (editing) {
        await slotService.update(stationId, editing.id, { ...payload, date: new Date(`${payload.date}T00:00:00.000Z`).toISOString() } as any);
      } else {
        for (let offset = 0; offset < occurrences; offset += 1) {
          const nextDate = new Date(`${payload.date}T00:00:00.000Z`);
          nextDate.setUTCDate(nextDate.getUTCDate() + offset);
          await slotService.create(stationId, {
            ...payload,
            date: nextDate.toISOString(),
            recurrence: occurrences > 1 ? { frequency: 'DAILY', occurrence: offset + 1, total: occurrences } : null,
          } as any);
        }
      }
      setShowSlot(false);
      setEditing(undefined);
      setSuccess(editing ? 'Đã cập nhật lịch thay pin.' : `Đã tạo ${occurrences} lịch thay pin.`);
      await load();
    } catch (cause) {
      setError(getApiErrorMessage(cause));
    } finally {
      setSaving(false);
    }
  };

  const setBayStatus = async (bay: ServiceBay, status: ServiceBay['status']) => {
    try {
      setSaving(true);
      await bayService.update(stationId, bay.id, { status });
      await load();
    } catch (cause) {
      setError(getApiErrorMessage(cause));
    } finally {
      setSaving(false);
    }
  };

  const removeBay = async () => {
    if (!deleteBay) return;
    try {
      setSaving(true);
      await bayService.remove(stationId, deleteBay.id);
      setDeleteBay(undefined);
      setSuccess('Đã xóa khoang.');
      await load();
    } catch (cause) {
      setError(getApiErrorMessage(cause));
    } finally {
      setSaving(false);
    }
  };

  const changeSlot = async (slot: ReplacementSlot, status: ReplacementSlot['status']) => {
    if (!window.confirm(`Chuyển lịch sang trạng thái ${stationStatusLabel(status)}?`)) return;
    try {
      setSaving(true);
      await slotService.update(stationId, slot.id, { status });
      setSuccess('Đã cập nhật trạng thái lịch.');
      await load();
    } catch (cause) {
      setError(getApiErrorMessage(cause));
    } finally {
      setSaving(false);
    }
  };

  const removeSlot = async (slot: ReplacementSlot) => {
    if (!window.confirm('Xóa lịch thay pin này?')) return;
    try {
      setSaving(true);
      await slotService.remove(stationId, slot.id);
      setSuccess('Đã xóa lịch thay pin.');
      await load();
    } catch (cause) {
      setError(getApiErrorMessage(cause));
    } finally {
      setSaving(false);
    }
  };

  const editSlot = (slot: ReplacementSlot) => {
    setEditing(slot);
    setSlotForm({
      bayId: slot.bayId,
      date: new Date(slot.date).toISOString().slice(0, 10),
      startTime: slot.startTime,
      endTime: slot.endTime,
      capacity: slot.capacity,
      status: slot.status,
      occurrences: 1,
    });
    setShowSlot(true);
  };

  return (
    <div className="space-y-6">
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

      {/* Khoang Thay Pin Section */}
      <section className="app-panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">Khoang thay pin</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Khoang vật lý phục vụ quy trình thay pin.</p>
          </div>
          <Button className="inline-flex items-center gap-2" onClick={() => setShowBay(true)}>
            <Plus className="h-4 w-4" />
            <span>Tạo khoang</span>
          </Button>
        </div>

        {loading ? (
          <div className="py-12 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-500" />
          </div>
        ) : bays.length ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {bays.map((bay) => (
              <article key={bay.id} className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-5 dark:border-slate-800 dark:bg-slate-900/60">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-xs font-black text-emerald-600 dark:text-emerald-400">{bay.bayCode}</span>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white">{bay.bayName}</h3>
                  </div>
                  <Badge variant={bay.status === 'AVAILABLE' ? 'success' : bay.status === 'MAINTENANCE' ? 'warning' : 'gray'}>
                    {stationStatusLabel(bay.status)}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  {bay.defaultDurationMinutes} phút · {bay.description || 'Không có mô tả'}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Button size="sm" variant="outline" disabled={saving} onClick={() => void setBayStatus(bay, bay.status === 'AVAILABLE' ? 'INACTIVE' : 'AVAILABLE')}>
                    {bay.status === 'AVAILABLE' ? 'Ngừng' : 'Kích hoạt'}
                  </Button>
                  <Button size="sm" variant="outline" disabled={saving} onClick={() => void setBayStatus(bay, 'MAINTENANCE')}>
                    <Wrench className="h-3.5 w-3.5 mr-1" />
                    Bảo trì
                  </Button>
                  <Button size="sm" variant="danger" disabled={saving} onClick={() => setDeleteBay(bay)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 p-10 text-center dark:border-slate-800 dark:bg-slate-900/40">
            <Warehouse className="h-10 w-10 text-slate-400" />
            <h4 className="mt-3 text-base font-bold text-slate-900 dark:text-white">Chưa có khoang thay pin</h4>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Bấm nút "Tạo khoang" ở trên để thêm khoang dịch vụ cho trạm.</p>
          </div>
        )}
      </section>

      {/* Lịch Thay Pin Section */}
      <section className="app-panel p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">Lịch thay pin</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Quản lý lịch một lần hoặc lặp theo ngày.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-40">
              <input type="date" className={inputStyle} value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="w-32">
              <select className={inputStyle} value={view} onChange={(e) => setView(e.target.value as 'day' | 'week')}>
                <option value="day">Theo ngày</option>
                <option value="week">Theo tuần</option>
              </select>
            </div>
            <Button
              disabled={!bays.length}
              onClick={() => {
                setEditing(undefined);
                setSlotForm({ ...newSlot(), bayId: bays[0]?.id || '', date });
                setShowSlot(true);
              }}
              className="inline-flex items-center gap-2"
            >
              <CalendarPlus className="h-4 w-4" />
              <span>Tạo lịch</span>
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-500" />
          </div>
        ) : slots.length ? (
          <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200/80 dark:border-slate-800">
            <table className="min-w-[1000px] w-full text-left text-sm">
              <thead className="bg-slate-100 text-xs font-extrabold uppercase text-slate-600 dark:bg-slate-800/80 dark:text-slate-300">
                <tr>
                  {['Ngày', 'Khoang', 'Thời gian', 'Sức chứa', 'Đặt/Giữ', 'Trạng thái', 'Hành động'].map((x) => (
                    <th className="p-3.5" key={x}>
                      {x}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                {slots.map((slot) => (
                  <tr key={slot.id} className="transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="p-3.5 font-bold">{new Date(slot.date).toLocaleDateString('vi-VN')}</td>
                    <td className="p-3.5">{bays.find((x) => x.id === slot.bayId)?.bayName || slot.bayId}</td>
                    <td className="p-3.5 font-mono">{slot.startTime} – {slot.endTime}</td>
                    <td className="p-3.5">{slot.capacity}</td>
                    <td className="p-3.5">{slot.bookedCount}/{slot.reservedCount}</td>
                    <td className="p-3.5">
                      <Badge variant={slot.status === 'AVAILABLE' ? 'success' : slot.status === 'FULL' ? 'error' : 'warning'}>
                        {stationStatusLabel(slot.status)}
                      </Badge>
                    </td>
                    <td className="p-3.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Button size="sm" variant="outline" onClick={() => editSlot(slot)}>
                          Sửa
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => void changeSlot(slot, 'BLOCKED')}>
                          Chặn
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => void changeSlot(slot, 'CANCELLED')}>
                          Hủy
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/admin/stations/${stationId}/bookings?date=${new Date(slot.date).toISOString().slice(0, 10)}`)}
                        >
                          Xem lịch đặt
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => void removeSlot(slot)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 p-10 text-center dark:border-slate-800 dark:bg-slate-900/40">
            <Calendar className="h-10 w-10 text-slate-400" />
            <h4 className="mt-3 text-base font-bold text-slate-900 dark:text-white">Không có lịch trong khoảng đã chọn</h4>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Thay đổi ngày xem hoặc bấm nút "Tạo lịch" ở trên để thêm khung giờ phục vụ.</p>
          </div>
        )}
      </section>

      {/* Modal Tạo Khoang */}
      <Modal
        isOpen={showBay}
        onClose={() => setShowBay(false)}
        title="Tạo khoang thay pin"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowBay(false)}>
              Hủy
            </Button>
            <Button loading={saving} form="bay-form" type="submit">
              Lưu
            </Button>
          </>
        }
      >
        <form id="bay-form" onSubmit={submitBay} className="space-y-3">
          <input required className={inputStyle} placeholder="Mã khoang (Ví dụ: BAY-01)" value={bayForm.bayCode} onChange={(e) => setBayForm({ ...bayForm, bayCode: e.target.value.toUpperCase() })} />
          <input required className={inputStyle} placeholder="Tên khoang (Ví dụ: Khoang Đổi Pin Nhanh 1)" value={bayForm.bayName} onChange={(e) => setBayForm({ ...bayForm, bayName: e.target.value })} />
          <input required type="number" min={5} max={240} className={inputStyle} value={bayForm.defaultDurationMinutes} onChange={(e) => setBayForm({ ...bayForm, defaultDurationMinutes: Number(e.target.value) })} />
          <textarea className={inputStyle} placeholder="Mô tả khoang" value={bayForm.description} onChange={(e) => setBayForm({ ...bayForm, description: e.target.value })} />
        </form>
      </Modal>

      {/* Modal Tạo / Sửa Lịch */}
      <Modal
        isOpen={showSlot}
        onClose={() => {
          setShowSlot(false);
          setEditing(undefined);
        }}
        title={editing ? 'Sửa lịch thay pin' : 'Tạo lịch thay pin'}
        footer={
          <>
            <Button variant="outline" onClick={() => setShowSlot(false)}>
              Hủy
            </Button>
            <Button loading={saving} form="slot-form" type="submit">
              Lưu
            </Button>
          </>
        }
      >
        <form id="slot-form" onSubmit={submitSlot} className="space-y-3">
          <select required className={inputStyle} value={slotForm.bayId} onChange={(e) => setSlotForm({ ...slotForm, bayId: e.target.value })}>
            {bays.map((bay) => (
              <option key={bay.id} value={bay.id}>
                {bay.bayCode} · {bay.bayName}
              </option>
            ))}
          </select>
          <input required type="date" className={inputStyle} value={slotForm.date} onChange={(e) => setSlotForm({ ...slotForm, date: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <input required type="time" className={inputStyle} value={slotForm.startTime} onChange={(e) => setSlotForm({ ...slotForm, startTime: e.target.value })} />
            <input required type="time" className={inputStyle} value={slotForm.endTime} onChange={(e) => setSlotForm({ ...slotForm, endTime: e.target.value })} />
          </div>
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
            Sức chứa
            <input required type="number" min={1} max={100} className={`${inputStyle} mt-1`} value={slotForm.capacity} onChange={(e) => setSlotForm({ ...slotForm, capacity: Number(e.target.value) })} />
          </label>
          {!editing && (
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
              Số ngày lặp liên tiếp
              <input type="number" min={1} max={31} className={`${inputStyle} mt-1`} value={slotForm.occurrences} onChange={(e) => setSlotForm({ ...slotForm, occurrences: Number(e.target.value) })} />
            </label>
          )}
        </form>
      </Modal>

      {/* Modal Xóa Khoang */}
      <Modal
        isOpen={!!deleteBay}
        onClose={() => setDeleteBay(undefined)}
        title="Xóa khoang thay pin?"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteBay(undefined)}>
              Hủy
            </Button>
            <Button variant="danger" loading={saving} onClick={() => void removeBay()}>
              Xóa
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600 dark:text-slate-300">Chỉ có thể xóa khoang chưa có lịch thay pin.</p>
      </Modal>
    </div>
  );
};
