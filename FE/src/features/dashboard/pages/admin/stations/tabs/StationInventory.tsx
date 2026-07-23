import { useCallback, useEffect, useState, type FC } from 'react';
import { useParams } from 'react-router-dom';
import { AlertCircle, Battery, Eye, History, Loader2, Plus, Search, Wrench, RefreshCw, ArrowRightLeft } from 'lucide-react';
import { Badge } from '../../../../../../components/ui/Badge';
import { Button } from '../../../../../../components/ui/Button';
import { Modal } from '../../../../../../components/ui/Modal';
import { getApiErrorMessage } from '../../../../../../services/apiClient';
import { stationInventoryService } from '../../../../../../services/stationDetailService';
import { stationStatusLabel } from '../stationStatusLabels';

type Action = 'ADD' | 'TRANSFER' | 'INSPECTION_REQUIRED' | 'MAINTENANCE';

export const StationInventory: FC = () => {
  const { stationId = '' } = useParams();
  const [data, setData] = useState<any>();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [safety, setSafety] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selected, setSelected] = useState<any>();
  const [action, setAction] = useState<Action>();
  const [batteryId, setBatteryId] = useState('');
  const [targetStationId, setTargetStationId] = useState('');
  const [reason, setReason] = useState('');
  const [history, setHistory] = useState<any[]>();

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      setData(await stationInventoryService.list(stationId, { search: search || undefined, status: status || undefined, safetyState: safety || undefined, page, limit: 20 }));
    } catch (cause) {
      setError(getApiErrorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, [stationId, search, status, safety, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const openAction = (next: Action, battery?: any) => {
    setAction(next);
    setBatteryId(battery?.id || battery?.batteryCode || battery?.serialNumber || '');
    setTargetStationId('');
    setReason('');
  };

  const submit = async () => {
    if (!batteryId || reason.trim().length < 3) {
      return setError('Mã pin và lý do tối thiểu 3 ký tự là bắt buộc.');
    }
    try {
      setBusy(true);
      setError('');
      await stationInventoryService.update(stationId, batteryId, { action, targetStationId: targetStationId || undefined, reason });
      setSuccess('Đã cập nhật kho pin và lưu lịch sử vòng đời.');
      setAction(undefined);
      await load();
    } catch (cause) {
      setError(getApiErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  const showHistory = async (b: any) => {
    try {
      setBusy(true);
      setError('');
      setSelected(b);
      setHistory(await stationInventoryService.history(stationId, b.id));
    } catch (cause) {
      setError(getApiErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  const inputStyle = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white focus:outline-none';

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white">Kho pin thay thế</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Pin thay thế đang lưu tại đúng trạm này.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              className={`${inputStyle} pl-9 pr-3`}
              placeholder="Mã hoặc serial…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <select
            className={`${inputStyle} px-3`}
            value={safety}
            onChange={(e) => {
              setSafety(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Mọi mức an toàn</option>
            {['SAFE', 'WARNING', 'UNSAFE', 'UNKNOWN'].map((x) => (
              <option key={x} value={x}>
                {stationStatusLabel(x)}
              </option>
            ))}
          </select>
          <select
            className={`${inputStyle} px-3`}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Mọi trạng thái</option>
            {['AVAILABLE', 'RESERVED', 'INSTALLED', 'INSPECTION_REQUIRED', 'MAINTENANCE', 'QUARANTINED', 'RETIRED'].map((x) => (
              <option key={x} value={x}>
                {stationStatusLabel(x)}
              </option>
            ))}
          </select>
          <Button className="inline-flex items-center gap-2" onClick={() => openAction('ADD')}>
            <Plus className="h-4 w-4" />
            <span>Thêm pin</span>
          </Button>
        </div>
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
      ) : data?.items.length ? (
        <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="min-w-[1400px] w-full text-left text-sm">
            <thead className="bg-slate-100 text-xs font-extrabold uppercase text-slate-600 dark:bg-slate-800/80 dark:text-slate-300">
              <tr>
                {['Mã pin', 'Loại pin', 'Sức khỏe pin (SOH)', 'Mức pin (SOC)', 'An toàn', 'Vận hành', 'Giữ chỗ', 'Xe tương thích', 'Kiểm tra cuối', 'Cập nhật', 'Hành động'].map((x) => (
                  <th className="p-3.5" key={x}>
                    {x}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
              {data.items.map((b: any) => (
                <tr className="transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/30" key={b.id}>
                  <td className="p-3.5 font-mono font-bold">{b.serialNumber || b.batteryCode}</td>
                  <td className="p-3.5">{b.batteryType?.code || b.type || '—'}</td>
                  <td className="p-3.5 font-bold">{b.soh}%</td>
                  <td className="p-3.5">{b.soc}%</td>
                  <td className="p-3.5">
                    <Badge variant={b.safetyState === 'SAFE' ? 'success' : b.safetyState === 'UNSAFE' ? 'error' : 'warning'}>
                      {stationStatusLabel(b.safetyState)}
                    </Badge>
                  </td>
                  <td className="p-3.5">{stationStatusLabel(b.operationalStatus)}</td>
                  <td className="p-3.5">{b.reservations?.length ? 'Đang giữ' : 'Không'}</td>
                  <td className="p-3.5 max-w-60">{b.batteryType?.compatibilities?.map((c: any) => `${c.vehicleModel.manufacturer} ${c.vehicleModel.name}`).join(', ') || '—'}</td>
                  <td className="p-3.5">{b.inspections?.[0] ? new Date(b.inspections[0].createdAt).toLocaleDateString('vi-VN') : '—'}</td>
                  <td className="p-3.5">{new Date(b.updatedAt).toLocaleString('vi-VN')}</td>
                  <td className="p-3.5">
                    <div className="flex items-center gap-1">
                      <Button title="Chi tiết" size="sm" variant="outline" onClick={() => { setSelected(b); setHistory(undefined); }}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button title="Lịch sử" size="sm" variant="outline" onClick={() => void showHistory(b)}>
                        <History className="h-4 w-4" />
                      </Button>
                      <Button title="Cần kiểm tra" size="sm" variant="outline" disabled={busy} onClick={() => openAction('INSPECTION_REQUIRED', b)}>
                        <RefreshCw className="h-3.5 w-3.5 mr-1" />
                        Kiểm tra
                      </Button>
                      <Button title="Bảo trì" size="sm" variant="outline" disabled={busy} onClick={() => openAction('MAINTENANCE', b)}>
                        <Wrench className="h-3.5 w-3.5 mr-1" />
                        Bảo trì
                      </Button>
                      <Button title="Chuyển trạm" size="sm" variant="outline" disabled={busy} onClick={() => openAction('TRANSFER', b)}>
                        <ArrowRightLeft className="h-3.5 w-3.5 mr-1" />
                        Chuyển
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
          <Battery className="h-10 w-10 text-slate-400" />
          <h3 className="mt-3 text-lg font-bold text-slate-900 dark:text-white">Không có pin phù hợp bộ lọc</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Bấm nút "Thêm pin" ở trên để thêm pin mới vào kho của trạm.</p>
        </div>
      )}

      {data && (
        <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
          <span>{data.total} pin</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>
              Trước
            </Button>
            <Button size="sm" variant="outline" disabled={page * 20 >= data.total} onClick={() => setPage(page + 1)}>
              Sau
            </Button>
          </div>
        </div>
      )}

      {/* Modal Chi tiết / Lịch sử Pin */}
      <Modal
        isOpen={!!selected}
        onClose={() => {
          setSelected(undefined);
          setHistory(undefined);
        }}
        title={history ? 'Lịch sử vòng đời pin' : 'Chi tiết pin'}
        footer={
          <Button variant="outline" onClick={() => { setSelected(undefined); setHistory(undefined); }}>
            Đóng
          </Button>
        }
      >
        {history ? (
          <div className="space-y-3">
            {history.length ? (
              history.map((x) => (
                <article key={x.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
                  <strong className="text-slate-900 dark:text-white">{stationStatusLabel(x.eventType)}</strong>
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    {stationStatusLabel(x.fromStatus)} → {stationStatusLabel(x.toStatus)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {x.reason || 'Không có ghi chú'} · {new Date(x.createdAt).toLocaleString('vi-VN')}
                  </p>
                </article>
              ))
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">Chưa có lịch sử vòng đời.</p>
            )}
          </div>
        ) : (
          <div className="grid gap-3 text-sm text-slate-800 dark:text-slate-200 sm:grid-cols-2">
            {selected && (
              <>
                <p><span className="font-bold">Mã pin:</span> {selected.serialNumber || selected.batteryCode || selected.id}</p>
                <p><span className="font-bold">Loại pin:</span> {selected.batteryType?.code || selected.type || '—'}</p>
                <p><span className="font-bold">Sức khỏe pin:</span> {selected.soh ?? '—'}%</p>
                <p><span className="font-bold">Mức pin:</span> {selected.soc ?? '—'}%</p>
                <p><span className="font-bold">Mức an toàn:</span> {stationStatusLabel(selected.safetyState)}</p>
                <p><span className="font-bold">Trạng thái vận hành:</span> {stationStatusLabel(selected.operationalStatus)}</p>
                <p><span className="font-bold">Cập nhật lần cuối:</span> {selected.updatedAt ? new Date(selected.updatedAt).toLocaleString('vi-VN') : '—'}</p>
              </>
            )}
          </div>
        )}
      </Modal>

      {/* Modal Hành động (Thêm / Chuyển / Bảo trì / Kiểm tra) */}
      <Modal
        isOpen={!!action}
        onClose={() => setAction(undefined)}
        title={action === 'ADD' ? 'Thêm pin vào trạm' : action === 'TRANSFER' ? 'Chuyển pin sang trạm khác' : action === 'INSPECTION_REQUIRED' ? 'Đánh dấu cần kiểm tra' : 'Gửi pin đi bảo trì'}
        footer={
          <>
            <Button variant="outline" onClick={() => setAction(undefined)}>
              Hủy
            </Button>
            <Button loading={busy} onClick={() => void submit()}>
              Xác nhận
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
            Mã pin / Serial
            <input
              disabled={action !== 'ADD'}
              className={`${inputStyle} mt-1.5 disabled:opacity-60`}
              placeholder="Nhập mã pin (Ví dụ: BAT-001 hoặc BAT-82KWH-01)"
              value={batteryId}
              onChange={(e) => setBatteryId(e.target.value)}
            />
          </label>
          {action === 'TRANSFER' && (
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
              Mã trạm nhận
              <input
                className={`${inputStyle} mt-1.5`}
                placeholder="Nhập ID trạm nhận"
                value={targetStationId}
                onChange={(e) => setTargetStationId(e.target.value)}
              />
            </label>
          )}
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
            Lý do (Tối thiểu 3 ký tự)
            <textarea
              className={`${inputStyle} mt-1.5 min-h-[80px]`}
              placeholder="Nhập lý do thực hiện thao tác này..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
        </div>
      </Modal>
    </div>
  );
};
