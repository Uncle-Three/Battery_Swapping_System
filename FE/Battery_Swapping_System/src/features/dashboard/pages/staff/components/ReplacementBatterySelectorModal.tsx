import type { FC } from 'react';
import { Button } from '../../../../../components/ui/Button';
import type { BatteryCandidate } from './ReplacementBatteryCard';
import { X, Battery, Search } from 'lucide-react';
import { useState } from 'react';

interface ReplacementBatterySelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidates: BatteryCandidate[];
  onSelectBattery: (battery: BatteryCandidate) => void;
  busy?: boolean;
}

const formatDate = (dateStr: string | Date) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return String(dateStr);
  }
};

export const ReplacementBatterySelectorModal: FC<ReplacementBatterySelectorModalProps> = ({
  isOpen,
  onClose,
  candidates,
  onSelectBattery,
  busy = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const filtered = candidates.filter((c) => {
    const term = searchTerm.toLowerCase();
    return (
      (c.code && c.code.toLowerCase().includes(term)) ||
      (c.serialNumber && c.serialNumber.toLowerCase().includes(term)) ||
      (c.storageLocation && c.storageLocation.toLowerCase().includes(term))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl dark:bg-slate-900 dark:border dark:border-slate-800">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Chọn pin thay thế từ kho trạm
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Danh sách pin mới (SOH 100%, SOC ≥ 80%) sắp xếp ưu tiên theo SOC cao nhất
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="border-b border-slate-100 px-6 py-3 dark:border-slate-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo mã pin, serial, vị trí kho..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-4 text-sm text-slate-800 focus:border-emerald-500 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
        </div>

        {/* Candidates Table */}
        <div className="flex-1 overflow-y-auto p-6">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-500 dark:text-slate-400">
              <Battery className="mx-auto mb-2 h-10 w-10 text-slate-300 dark:text-slate-600" />
              <p className="font-semibold">Không tìm thấy pin phù hợp</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm dark:divide-slate-800">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Mã pin / Serial</th>
                    <th className="px-4 py-3">Loại pin</th>
                    <th className="px-4 py-3 text-center">SOH / SOC</th>
                    <th className="px-4 py-3">Vị trí kho</th>
                    <th className="px-4 py-3">Ngày nhập kho</th>
                    <th className="px-4 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-900">
                  {filtered.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3">
                        <p className="font-mono font-bold text-slate-900 dark:text-white">
                          {c.code || c.serialNumber}
                        </p>
                        <p className="font-mono text-xs text-slate-400">{c.serialNumber}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {c.batteryType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                          <span>SOH {c.soh}%</span>
                          <span>•</span>
                          <span>SOC {c.soc}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                        {c.storageLocation || 'Kệ A - Ô 05'}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                        {formatDate(c.receivedAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="primary"
                          size="sm"
                          disabled={busy}
                          onClick={() => {
                            onSelectBattery(c);
                            onClose();
                          }}
                        >
                          Chọn
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end border-t border-slate-200 px-6 py-4 dark:border-slate-800">
          <Button variant="outline" size="sm" onClick={onClose}>
            Đóng
          </Button>
        </div>
      </div>
    </div>
  );
};
