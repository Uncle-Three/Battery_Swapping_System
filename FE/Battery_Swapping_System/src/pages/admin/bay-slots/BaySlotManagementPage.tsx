import { AlertCircle, CheckCircle2, Plus, RotateCcw, Warehouse } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FC,
  type FormEvent,
} from 'react';
import { useOutletContext, useParams } from 'react-router-dom';
import { BaySlotGenerationForm } from '../../../components/admin/bay-slots/BaySlotGenerationForm';
import { BaySlotPreviewMatrix } from '../../../components/admin/bay-slots/BaySlotPreviewMatrix';
import {
  BaySlotToggleModal,
  type EditableSlotStatus,
} from '../../../components/admin/bay-slots/BaySlotToggleModal';
import type {
  BulkSlotPayload,
  PreviewSlot,
  SlotGenerationValues,
} from '../../../components/admin/bay-slots/types';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { getApiErrorMessage } from '../../../services/apiClient';
import {
  bayService,
  type ServiceBay,
} from '../../../services/stationDetailService';
import { adminBaySlotApi } from '../../../services/adminBaySlotApi';
import type { StationDetailContext } from '../../../features/dashboard/pages/admin/stations/StationDetailHub';

const localDate = (date = new Date()) => {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
};

const addDays = (date: string, amount: number) => {
  const value = new Date(`${date}T12:00:00`);
  value.setDate(value.getDate() + amount);
  return localDate(value);
};

const minutes = (time: string) => {
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
};

const timeFromMinutes = (value: number) =>
  `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;

const slotKey = (slot: Pick<PreviewSlot, 'bayId' | 'date' | 'startTime' | 'endTime'>) =>
  `${slot.bayId}:${slot.date}:${slot.startTime}:${slot.endTime}`;
const inputClass =
  'mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white';

const emptyBayForm = {
  bayCode: '',
  bayName: '',
  status: 'AVAILABLE' as const,
  defaultDurationMinutes: 30,
  description: '',
};

const defaultValues = (
  openingTime = '08:00',
  closingTime = '17:00',
  workingDays: string[] = [],
  bufferMinutes = 0,
): SlotGenerationValues => {
  const dateFrom = localDate();
  const weekdayNumbers: Record<string, number> = {
    SUN: 0,
    MON: 1,
    TUE: 2,
    WED: 3,
    THU: 4,
    FRI: 5,
    SAT: 6,
  };
  return {
    dateFrom,
    dateTo: addDays(dateFrom, 6),
    daysOfWeek: workingDays.length
      ? workingDays.map((day) => weekdayNumbers[day]).filter((day) => day !== undefined)
      : [1, 2, 3, 4, 5, 6, 0],
    openingTime,
    closingTime,
    slotDurationMinutes: 60,
    bufferMinutes,
    selectedBayIds: [],
  };
};

const validate = (values: SlotGenerationValues) => {
  if (!values.dateFrom || !values.dateTo) return 'Vui lòng chọn đầy đủ khoảng ngày.';
  if (values.dateFrom < localDate()) return 'Ngày bắt đầu không được ở trong quá khứ.';
  if (values.dateFrom > values.dateTo) return 'Ngày kết thúc phải từ ngày bắt đầu trở đi.';
  if (!values.daysOfWeek.length) return 'Vui lòng chọn ít nhất một ngày hoạt động.';
  if (minutes(values.openingTime) >= minutes(values.closingTime)) return 'Giờ mở cửa phải sớm hơn giờ đóng cửa.';
  if (!values.selectedBayIds.length) return 'Vui lòng chọn ít nhất một khoang.';
  if (minutes(values.openingTime) + values.slotDurationMinutes > minutes(values.closingTime)) {
    return 'Khoảng giờ đã chọn không đủ để tạo một slot.';
  }
  return '';
};

const createLocalSlots = (values: SlotGenerationValues, bays: ServiceBay[]) => {
  const selected = bays.filter((bay) => values.selectedBayIds.includes(bay.id));
  const ranges: Array<{ startTime: string; endTime: string }> = [];
  const close = minutes(values.closingTime);
  for (
    let start = minutes(values.openingTime);
    start + values.slotDurationMinutes <= close;
    start += values.slotDurationMinutes + values.bufferMinutes
  ) {
    ranges.push({
      startTime: timeFromMinutes(start),
      endTime: timeFromMinutes(start + values.slotDurationMinutes),
    });
  }

  const result: PreviewSlot[] = [];
  for (let date = values.dateFrom; date <= values.dateTo; date = addDays(date, 1)) {
    const weekday = new Date(`${date}T12:00:00`).getDay();
    if (!values.daysOfWeek.includes(weekday)) continue;
    for (const bay of selected) {
      for (const range of ranges) {
        result.push({
          bayId: bay.id,
          bayCode: bay.bayCode,
          bayName: bay.bayName,
          date,
          ...range,
          status: 'AVAILABLE',
        });
      }
    }
  }
  return result;
};

export const BaySlotManagementPage: FC = () => {
  const { stationId = '' } = useParams();
  const { station } = useOutletContext<StationDetailContext>();
  const [bays, setBays] = useState<ServiceBay[]>([]);
  const [values, setValues] = useState(() =>
    defaultValues(
      station.openingTime,
      station.closingTime,
      station.workingDays,
      station.baySlotBufferMinutes ?? 0,
    ),
  );
  const [persistedBufferMinutes, setPersistedBufferMinutes] = useState(
    station.baySlotBufferMinutes ?? 0,
  );
  const [previewSlots, setPreviewSlots] = useState<PreviewSlot[]>([]);
  const [previewDate, setPreviewDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [previewError, setPreviewError] = useState('');
  const [success, setSuccess] = useState('');
  const [notice, setNotice] = useState('');
  const [toggleSlot, setToggleSlot] = useState<PreviewSlot | null>(null);
  const [toggleTargetStatus, setToggleTargetStatus] =
    useState<EditableSlotStatus>('RESERVED');
  const [toggleReason, setToggleReason] = useState('');
  const [showBayModal, setShowBayModal] = useState(false);
  const [bayForm, setBayForm] = useState(emptyBayForm);
  const [bayError, setBayError] = useState('');
  const autoPreviewKeyRef = useRef('');

  const loadBays = useCallback(async () => {
    try {
      setLoading(true);
      setFormError('');
      const nextBays = await bayService.list(stationId);
      setBays(nextBays);
      setValues((current) => ({
        ...current,
        selectedBayIds: nextBays
          .filter((bay) => bay.status !== 'INACTIVE')
          .map((bay) => bay.id),
      }));
    } catch (cause) {
      setFormError(getApiErrorMessage(cause, 'Không thể tải danh sách khoang.'));
    } finally {
      setLoading(false);
    }
  }, [stationId]);

  useEffect(() => {
    void loadBays();
  }, [loadBays]);

  useEffect(() => {
    if (![30, 60].includes(values.slotDurationMinutes)) {
      setValues((current) => ({ ...current, slotDurationMinutes: 60 }));
    }
  }, [values.slotDurationMinutes]);

  const loadSlotsFromDb = useCallback(async () => {
    if (!values.dateFrom || !values.dateTo || values.dateFrom > values.dateTo) return;
    try {
      setPreviewLoading(true);
      setFormError('');
      setPreviewError('');
      setNotice('');
      const dates: string[] = [];
      for (let date = values.dateFrom; date <= values.dateTo; date = addDays(date, 1)) {
        dates.push(date);
      }
      const results = await Promise.all(
        dates.map((date) => adminBaySlotApi.getBaySlotsByDate(stationId, { date, limit: 100 })),
      );
      const fetchedSlots: PreviewSlot[] = [];
      results.forEach((result) =>
        result.bays.forEach((bay) =>
          bay.slots.forEach((slot) => {
            fetchedSlots.push({
              bayId: bay.bayId,
              bayCode: bay.bayCode,
              bayName: bay.bayName,
              date: result.date,
              startTime: slot.displayStartTime,
              endTime: slot.displayEndTime,
              status: slot.status,
              reason: slot.offReason ?? slot.blockedReason ?? undefined,
              backendId: slot.id,
              bookingId: slot.bookingId,
              bufferMinutes: slot.bufferMinutes,
              cooldownEndsAt: slot.cooldownEndsAt,
            });
          }),
        ),
      );
      setPreviewSlots(fetchedSlots);
      setPreviewDate((current) => (current && dates.includes(current) ? current : values.dateFrom));
    } catch (cause) {
      setPreviewError(getApiErrorMessage(cause, 'Không thể tải danh sách khung giờ từ cơ sở dữ liệu.'));
    } finally {
      setPreviewLoading(false);
    }
  }, [stationId, values.dateFrom, values.dateTo]);

  useEffect(() => {
    if (loading || !bays.length) return;
    const key = [stationId, values.dateFrom, values.dateTo].join(':');
    if (autoPreviewKeyRef.current === key) return;
    autoPreviewKeyRef.current = key;
    void loadSlotsFromDb();
  }, [bays.length, loadSlotsFromDb, loading, stationId, values.dateFrom, values.dateTo]);

  const reset = () => {
    const next = defaultValues(
      station.openingTime,
      station.closingTime,
      station.workingDays,
      persistedBufferMinutes,
    );
    next.selectedBayIds = bays.filter((bay) => bay.status !== 'INACTIVE').map((bay) => bay.id);
    setValues(next);
    setPreviewSlots([]);
    setPreviewDate('');
    setFormError('');
    setPreviewError('');
    setSuccess('');
    setNotice('');
    autoPreviewKeyRef.current = '';
    void loadSlotsFromDb();
  };

  const openBayModal = () => {
    const existingCodes = new Set(bays.map((bay) => bay.bayCode.toUpperCase()));
    let bayCode = '';
    for (let attempt = 0; attempt < 1000; attempt += 1) {
      const suffix = String(Math.floor(1_000_000 + Math.random() * 9_000_000));
      const candidate = `E${suffix}`;
      if (!existingCodes.has(candidate)) {
        bayCode = candidate;
        break;
      }
    }
    setBayForm({
      ...emptyBayForm,
      bayCode,
      bayName: bayCode ? `Khoang ${bayCode}` : '',
      defaultDurationMinutes: values.slotDurationMinutes,
    });
    setBayError('');
    setShowBayModal(true);
  };

  const createBay = async (event: FormEvent) => {
    event.preventDefault();
    if (!bayForm.bayCode || !bayForm.bayName.trim()) {
      setBayError('Vui lòng nhập đầy đủ mã và tên khoang.');
      return;
    }
    try {
      setSaving(true);
      setBayError('');
      await bayService.create(stationId, bayForm);
      setShowBayModal(false);
      await loadBays();
      setSuccess(`Đã tạo khoang ${bayForm.bayCode} thành công.`);
    } catch (cause) {
      setBayError(getApiErrorMessage(cause, 'Không thể tạo khoang mới.'));
    } finally {
      setSaving(false);
    }
  };

  const createSlots = async () => {
    const issue = validate(values);
    if (issue) {
      setFormError(issue);
      return;
    }

    const slotsToCreate = createLocalSlots(values, bays);
    if (!slotsToCreate.length) {
      setFormError('Không có slot nào được tạo với ngày hoạt động đã chọn.');
      return;
    }

    const payload: BulkSlotPayload = {
      stationId,
      dateFrom: values.dateFrom,
      dateTo: values.dateTo,
      daysOfWeek: values.daysOfWeek,
      openingTime: values.openingTime,
      closingTime: values.closingTime,
      slotDurationMinutes: values.slotDurationMinutes,
      bufferMinutes: values.bufferMinutes,
      slots: slotsToCreate.map(({ bayId, date, startTime, endTime, status, reason }) => ({
        bayId,
        date,
        startTime,
        endTime,
        status,
        ...(reason ? { reason } : {}),
      })),
    };

    try {
      setSaving(true);
      setFormError('');
      setPreviewError('');
      setSuccess('');
      setNotice('');
      const result = await adminBaySlotApi.createBaySlotsBulk(stationId, payload);
      setPersistedBufferMinutes(values.bufferMinutes);
      await loadSlotsFromDb();
      setSuccess(`Đã tạo và lưu thành công ${result.summary.created} slot vào cơ sở dữ liệu; bỏ qua ${result.summary.skipped} slot đã tồn tại hoặc không hợp lệ.`);
      if (result.summary.skipped > 0) {
        setNotice(`${result.summary.skipped} slot đã tồn tại hoặc nằm trong quá khứ được giữ nguyên.`);
      }
    } catch (cause) {
      setPreviewError(
        getApiErrorMessage(
          cause,
          'Không thể hoàn tất tạo slot.',
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSlotClick = (slot: PreviewSlot) => {
    if (slot.status === 'AVAILABLE' || slot.status === 'OFF') {
      setToggleSlot(slot);
      setToggleTargetStatus(slot.status === 'OFF' ? 'AVAILABLE' : 'RESERVED');
      setToggleReason(slot.reason ?? '');
      return;
    }
    if (slot.status === 'RESERVED' && !slot.bookingId) {
      setToggleSlot(slot);
      setToggleTargetStatus('COMPLETED');
      setToggleReason('');
      return;
    }
    if (slot.status === 'COMPLETED' && !slot.bookingId) {
      setToggleSlot(slot);
      setToggleTargetStatus('AVAILABLE');
      setToggleReason('');
      return;
    }
    if (slot.status === 'RESERVED' || slot.status === 'CHECKED_IN') {
      setNotice('Khung giờ này đã có người đặt. Hãy hủy hoặc chuyển booking trước khi tắt.');
      return;
    }
    if (slot.status === 'IN_PROGRESS' || slot.status === 'COMPLETED') {
      setNotice('Khung giờ đang được sử dụng và không thể thay đổi.');
    }
  };

  const applyToggle = async () => {
    if (!toggleSlot) return;
    const nextStatus: EditableSlotStatus =
      toggleSlot.status === 'OFF' ? 'AVAILABLE' : toggleTargetStatus;
    try {
      if (toggleSlot.backendId) {
        setSaving(true);
        await adminBaySlotApi.updateBaySlotStatus(
          toggleSlot.backendId,
          nextStatus,
          nextStatus === 'OFF' ? toggleReason.trim() || undefined : undefined,
        );
        await loadSlotsFromDb();
      } else {
        setPreviewSlots((current) =>
          current.map((slot) =>
            slotKey(slot) === slotKey(toggleSlot)
              ? {
                  ...slot,
                  status: nextStatus,
                  reason: nextStatus === 'OFF'
                    ? toggleReason.trim() || undefined
                    : undefined,
                }
              : slot,
          ),
        );
      }
      setToggleSlot(null);
      setToggleTargetStatus('RESERVED');
      setToggleReason('');
      setNotice(
        nextStatus === 'OFF'
          ? 'Đã tắt khung giờ.'
          : nextStatus === 'RESERVED'
            ? 'Đã chuyển khung giờ sang trạng thái Đã đặt.'
            : nextStatus === 'COMPLETED'
              ? 'Đã hoàn thành lượt phục vụ khách vãng lai.'
              : 'Đã chuyển khung giờ về Còn trống.',
      );
    } catch (cause) {
      setPreviewError(getApiErrorMessage(cause, 'Không thể cập nhật trạng thái slot.'));
    } finally {
      setSaving(false);
    }
  };

  const canCreate = !loading && bays.length > 0 && values.selectedBayIds.length > 0;

  const previewDates = useMemo(() => {
    if (!values.dateFrom || !values.dateTo || values.dateFrom > values.dateTo) return [];
    const dates: string[] = [];
    for (let date = values.dateFrom; date <= values.dateTo; date = addDays(date, 1)) {
      dates.push(date);
    }
    return dates;
  }, [values.dateFrom, values.dateTo]);

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 rounded-[18px] border border-emerald-100 bg-gradient-to-r from-white to-emerald-50/60 p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:from-slate-900 dark:to-emerald-950/20">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white sm:text-2xl">
            Quản lý khung giờ khoang đổi pin
          </h1>
          <p className="mt-1.5 text-sm font-medium text-slate-500">
            Admin tạo lịch hàng loạt và áp dụng cho một hoặc nhiều khoang.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Button variant="outline" className="col-span-2 sm:col-span-1" onClick={openBayModal}>
            <Warehouse className="h-4 w-4" /> Tạo khoang
          </Button>
          <Button variant="outline" onClick={reset}>
            <RotateCcw className="h-4 w-4" /> Đặt lại
          </Button>
          <Button disabled={!canCreate || saving} onClick={() => void createSlots()}>
            <Plus className="h-4 w-4" /> Tạo & Lưu slot
          </Button>
        </div>
      </header>

      {success && (
        <div role="status" className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm font-bold text-emerald-700">
          <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" />{success}</span>
          <button type="button" onClick={() => setSuccess('')} className="text-xs underline">Đóng</button>
        </div>
      )}
      {previewError && !previewSlots.length && (
        <div role="alert" className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-sm font-bold text-rose-700">
          <AlertCircle className="h-4 w-4" /> {previewError}
        </div>
      )}

      <div className="grid items-start gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
        <BaySlotGenerationForm
          bays={bays}
          values={values}
          onChange={setValues}
          onCreate={() => void createSlots()}
          loading={loading}
          saving={saving}
          canCreate={canCreate}
          error={formError}
          onRetry={() => void loadBays()}
        />
        <BaySlotPreviewMatrix
          slots={previewSlots}
          previewDates={previewDates}
          previewDate={previewDate}
          onPreviewDateChange={setPreviewDate}
          loading={previewLoading}
          error={previewError}
          notice={notice}
          onRetry={() => void loadSlotsFromDb()}
          onSlotClick={handleSlotClick}
        />
      </div>

      <BaySlotToggleModal
        slot={toggleSlot}
        targetStatus={toggleTargetStatus}
        reason={toggleReason}
        onTargetStatusChange={setToggleTargetStatus}
        onReasonChange={setToggleReason}
        onClose={() => {
          setToggleSlot(null);
          setToggleTargetStatus('RESERVED');
        }}
        onConfirm={() => void applyToggle()}
      />

      <Modal
        isOpen={showBayModal}
        onClose={() => setShowBayModal(false)}
        title="Tạo khoang đổi pin"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowBayModal(false)}>
              Hủy
            </Button>
            <Button type="submit" form="create-bay-form" loading={saving}>
              <Plus className="h-4 w-4" /> Tạo khoang
            </Button>
          </>
        }
      >
        <form id="create-bay-form" onSubmit={createBay} className="space-y-4">
          {bayError && (
            <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
              {bayError}
            </div>
          )}
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
            Mã khoang
            <input
              required
              pattern="E\d{7}"
              title="Mã khoang gồm chữ E và 7 chữ số"
              value={bayForm.bayCode}
              onChange={(event) =>
                setBayForm({ ...bayForm, bayCode: event.target.value.toUpperCase() })
              }
              className={inputClass}
            />
          </label>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
            Tên khoang
            <input
              required
              maxLength={100}
              value={bayForm.bayName}
              onChange={(event) => setBayForm({ ...bayForm, bayName: event.target.value })}
              className={inputClass}
            />
          </label>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
            Mô tả
            <textarea
              rows={3}
              maxLength={500}
              value={bayForm.description}
              onChange={(event) =>
                setBayForm({ ...bayForm, description: event.target.value })
              }
              placeholder="Thông tin vị trí hoặc ghi chú vận hành"
              className={`${inputClass} resize-none`}
            />
          </label>
          <p className="text-[11px] leading-4 text-slate-500">
            Khoang mới sẽ được kích hoạt ở trạng thái Sẵn sàng và tự động xuất hiện trong danh sách chọn.
          </p>
        </form>
      </Modal>
    </div>
  );
};
