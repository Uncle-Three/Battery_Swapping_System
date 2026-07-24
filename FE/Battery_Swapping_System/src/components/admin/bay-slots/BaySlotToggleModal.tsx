import type { FC } from 'react';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';
import type { PreviewSlot } from './types';

export const BaySlotToggleModal: FC<{
  slot: PreviewSlot | null;
  reason: string;
  onReasonChange: (reason: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}> = ({ slot, reason, onReasonChange, onClose, onConfirm }) => {
  const turningOn = slot?.status === 'OFF';
  return (
    <Modal
      isOpen={Boolean(slot)}
      onClose={onClose}
      title={turningOn ? 'Bật lại khung giờ này?' : 'Tắt khung giờ?'}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Hủy</Button>
          <Button variant={turningOn ? 'primary' : 'danger'} onClick={onConfirm}>
            {turningOn ? 'Xác nhận bật' : 'Xác nhận tắt'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
          <p className="font-mono text-sm font-black text-slate-800 dark:text-white">{slot?.bayCode}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            {slot?.date} · {slot?.startTime}–{slot?.endTime}
          </p>
        </div>
        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
          {turningOn
            ? 'Người dùng sẽ có thể đặt khoang này trong khung giờ đã chọn.'
            : 'Người dùng sẽ không thể đặt khoang này trong khung giờ đã chọn.'}
        </p>
        {!turningOn && (
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
