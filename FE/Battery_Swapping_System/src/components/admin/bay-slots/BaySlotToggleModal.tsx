import type { FC } from 'react';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';
import type { PreviewSlot } from './types';

export type EditableSlotStatus = 'AVAILABLE' | 'OFF' | 'RESERVED' | 'COMPLETED';

const labels: Record<EditableSlotStatus, string> = {
  AVAILABLE: 'Còn trống',
  OFF: 'Tắt slot',
  RESERVED: 'Đã đặt',
  COMPLETED: 'Hoàn thành',
};

export const BaySlotToggleModal: FC<{
  slot: PreviewSlot | null;
  targetStatus: EditableSlotStatus;
  reason: string;
  onTargetStatusChange: (status: EditableSlotStatus) => void;
  onReasonChange: (reason: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}> = ({
  slot,
  targetStatus,
  reason,
  onTargetStatusChange,
  onReasonChange,
  onClose,
  onConfirm,
}) => {
  const options: EditableSlotStatus[] =
    slot?.status === 'AVAILABLE'
      ? ['RESERVED', 'OFF']
      : slot?.status === 'RESERVED'
        ? ['COMPLETED', 'AVAILABLE']
        : ['AVAILABLE'];
  const nextStatus = slot?.status === 'OFF' ? 'AVAILABLE' : targetStatus;

  return (
    <Modal
      isOpen={Boolean(slot)}
      onClose={onClose}
      title="Cập nhật trạng thái khung giờ"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Hủy</Button>
          <Button
            variant={nextStatus === 'OFF' ? 'danger' : 'primary'}
            onClick={onConfirm}
          >
            Xác nhận
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
          <p className="font-mono text-sm font-black text-slate-800 dark:text-white">
            {slot?.bayCode}
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            {slot?.date} · {slot?.startTime}–{slot?.endTime}
          </p>
        </div>

        {options.length === 1 ? (
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
            Slot sẽ chuyển về trạng thái <strong>{labels[options[0]]}</strong>.
          </p>
        ) : (
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
            Trạng thái mới
            <select
              value={targetStatus}
              onChange={(event) =>
                onTargetStatusChange(event.target.value as EditableSlotStatus)
              }
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 dark:border-slate-700 dark:bg-slate-900"
            >
              {options.map((status) => (
                <option key={status} value={status}>{labels[status]}</option>
              ))}
            </select>
          </label>
        )}

        {nextStatus === 'OFF' && (
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
            Lý do (không bắt buộc)
            <textarea
              rows={3}
              value={reason}
              onChange={(event) => onReasonChange(event.target.value)}
              placeholder="Ví dụ: Không đủ nhân sự vận hành"
              className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 dark:border-slate-700 dark:bg-slate-900"
            />
          </label>
        )}
      </div>
    </Modal>
  );
};
