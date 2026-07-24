import { useEffect, useState } from 'react';
import { Modal } from '../ui/Modal';

interface Props { open: boolean; title: string; description: string; requireCategory?: boolean; loading: boolean; onClose: () => void; onConfirm: (value: { reason: string; notes?: string; category?: string }) => Promise<void> }
export const VehicleActionModal = ({ open, title, description, requireCategory, loading, onClose, onConfirm }: Props) => {
  const [reason, setReason] = useState(''); const [notes, setNotes] = useState(''); const [category, setCategory] = useState('OTHER'); const [confirmed, setConfirmed] = useState(false); const [error, setError] = useState('');
  useEffect(() => { if (open) { setReason(''); setNotes(''); setConfirmed(false); setError(''); } }, [open]);
  const submit = async () => { if (reason.trim().length < 5) return setError('Vui lòng nhập lý do ít nhất 5 ký tự.'); if (!confirmed) return setError('Vui lòng xác nhận thao tác.'); setError(''); await onConfirm({ reason: reason.trim(), notes: notes.trim() || undefined, category }); };
  return <Modal isOpen={open} onClose={onClose} title={title} footer={<><button type="button" onClick={onClose} disabled={loading} className="rounded-lg border px-4 py-2 text-sm font-semibold">Hủy</button><button type="button" onClick={() => void submit()} disabled={loading} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{loading ? 'Đang xử lý...' : 'Xác nhận'}</button></>}>
    <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">{description}</p>
    {requireCategory && <label className="mb-4 block text-sm font-semibold">Loại khóa<select value={category} onChange={(event) => setCategory(event.target.value)} className="mt-1 w-full rounded-lg border bg-white p-2.5 dark:bg-slate-800"><option value="OWNERSHIP_DISPUTE">Tranh chấp sở hữu</option><option value="REPORTED_STOLEN">Báo mất cắp</option><option value="FRAUD_SUSPECTED">Nghi ngờ gian lận</option><option value="INVALID_VIN">VIN không hợp lệ</option><option value="SAFETY_RISK">Rủi ro an toàn</option><option value="OTHER">Khác</option></select></label>}
    <label className="block text-sm font-semibold">Lý do <span className="text-red-500">*</span><textarea autoFocus value={reason} onChange={(event) => setReason(event.target.value)} rows={3} className="mt-1 w-full rounded-lg border bg-white p-2.5 dark:bg-slate-800" /></label>
    <label className="mt-4 block text-sm font-semibold">Ghi chú<textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} className="mt-1 w-full rounded-lg border bg-white p-2.5 dark:bg-slate-800" /></label>
    <label className="mt-4 flex items-start gap-2 text-sm"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-1" /> Tôi xác nhận đã kiểm tra thông tin và muốn thực hiện thao tác này.</label>
    {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
  </Modal>;
};
