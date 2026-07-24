import { useCallback, useEffect, useState, type FC } from 'react';
import { useParams } from 'react-router-dom';
import { AlertCircle, Battery, Eye, Loader2, Plus, Search, Wrench, Trash2, QrCode, Download, Copy, Check } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Badge } from '../../../../../../components/ui/Badge';
import { Button } from '../../../../../../components/ui/Button';
import { Modal } from '../../../../../../components/ui/Modal';
import { AddNewBatteryModal } from '../../../../components/AddNewBatteryModal';
import { batteryService } from '../../../../../../services/batteryService';
import { vehicleModelService } from '../../../../../../services/vehicleModelService';
import { getApiErrorMessage } from '../../../../../../services/apiClient';
import { stationInventoryService } from '../../../../../../services/stationDetailService';
import { stationStatusLabel } from '../stationStatusLabels';

type Action = 'INSPECTION_REQUIRED' | 'MAINTENANCE' | 'RETIRE';

const formatBatteryTypeLabel = (bt: any, fallbackCode?: string) => {
  const code = bt?.code || fallbackCode || '';
  if (!code) return '—';
  const cleanCode = code
    .replace(/^Pin\s+/i, '')
    .replace(/\s*-\s*\d+(\.\d+)?\s*kWh.*$/i, '')
    .replace(/\s+\d+(\.\d+)?\s*kWh.*$/i, '')
    .replace(/\s*\(\d+V\).*$/i, '')
    .trim() || code;
  return cleanCode;
};

const getCompatibleVehicles = (b: any) => {
  if (!b) return '—';
  if (b.batteryType?.compatibilities?.length) {
    const names = b.batteryType.compatibilities
      .map((c: any) => c.vehicleModel ? `${c.vehicleModel.manufacturer || 'VinFast'} ${c.vehicleModel.name}` : '')
      .filter(Boolean);
    if (names.length) return names.join(', ');
  }
  const code = (b.batteryType?.code || b.type || '').toUpperCase();
  if (code.includes('VF3')) return 'VinFast VF 3';
  if (code.includes('VF5')) return 'VinFast VF 5';
  if (code.includes('VFE34')) return 'VinFast VF e34';
  if (code.includes('VF6')) return 'VinFast VF 6 Eco, VinFast VF 6 Plus';
  if (code.includes('VF7_59')) return 'VinFast VF 7 Eco';
  if (code.includes('VF7_70')) return 'VinFast VF 7 Plus';
  if (code.includes('VF8')) return 'VinFast VF 8 Eco, VinFast VF 8 Plus';
  if (code.includes('VF9')) return 'VinFast VF 9 Eco, VinFast VF 9 Plus';
  return '—';
};

export const StationInventory: FC = () => {
  const { stationId = '' } = useParams();
  const [data, setData] = useState<any>();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [safety, setSafety] = useState('');
  const [batteryType, setBatteryType] = useState('');
  const [batteryTypesList, setBatteryTypesList] = useState<any[]>([]);
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleModelsList, setVehicleModelsList] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selected, setSelected] = useState<any>();
  const [action, setAction] = useState<Action>();
  const [batteryId, setBatteryId] = useState('');
  const [reason, setReason] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [qrModalBattery, setQrModalBattery] = useState<any>();
  const [copiedQr, setCopiedQr] = useState(false);

  const handleDownloadQr = (battery: any) => {
    const svg = document.getElementById('inventory-qr-svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width + 40;
      canvas.height = img.height + 40;
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 20, 20);
        const pngFile = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        const code = battery?.batteryCode || battery?.serialNumber || 'pin';
        downloadLink.download = `QR-${code}.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
      }
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  useEffect(() => {
    batteryService.getBatteryTypes().then(setBatteryTypesList).catch(() => {});
    vehicleModelService.getVehicleModels().then(setVehicleModelsList).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      setData(
        await stationInventoryService.list(stationId, {
          search: search || undefined,
          status: status || undefined,
          safetyState: safety || undefined,
          batteryType: batteryType || undefined,
          vehicleModel: vehicleModel || undefined,
          page,
          limit: 20,
        })
      );
    } catch (cause) {
      setError(getApiErrorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, [stationId, search, status, safety, batteryType, vehicleModel, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const openAction = (next: Action, battery: any) => {
    setAction(next);
    setBatteryId(battery?.serialNumber || battery?.batteryCode || battery?.id || '');
    setReason('');
  };

  const submit = async () => {
    if (!batteryId || reason.trim().length < 3) {
      return setError('Mã pin và lý do tối thiểu 3 ký tự là bắt buộc.');
    }
    try {
      setBusy(true);
      setError('');
      await stationInventoryService.update(stationId, batteryId, { action, reason });
      setSuccess('Đã cập nhật trạng thái kho pin thành công.');
      setAction(undefined);
      await load();
    } catch (cause) {
      setError(getApiErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  const inputStyle = 'rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20';

  return (
    <div className="space-y-5">
      {/* Header & Controls Toolbar in a compact single row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-base font-black text-slate-900 dark:text-white">Kho pin trạm</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Toàn bộ pin của trạm được lưu giữ và phân biệt theo trạng thái</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search */}
          <div className="relative min-w-[180px]">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              className={`${inputStyle} w-full pl-8 pr-3`}
              placeholder="Mã hoặc serial…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          {/* Safety Filter */}
          <select
            className={`${inputStyle} w-36`}
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

          {/* Status Filter */}
          <select
            className={`${inputStyle} w-36`}
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

          {/* Battery Type Filter */}
          <select
            className={`${inputStyle} w-36`}
            value={batteryType}
            onChange={(e) => {
              setBatteryType(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Mọi loại pin</option>
            {batteryTypesList.map((t) => (
              <option key={t.id || t.code} value={t.code || t.id}>
                {t.code}
              </option>
            ))}
            {batteryTypesList.length === 0 &&
              ['VF3_LFP_18', 'VF5_LFP_37', 'VFE34_LIION_42', 'VF6_LFP_59', 'VF7_59', 'VF7_70', 'VF8_LARGE', 'VF9_SDI', 'VF9_CATL'].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
          </select>

          {/* Vehicle Model Filter */}
          <select
            className={`${inputStyle} w-40`}
            value={vehicleModel}
            onChange={(e) => {
              setVehicleModel(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Mọi xe tương thích</option>
            {vehicleModelsList.map((m) => (
              <option key={m.id || m.name} value={m.name || m.id}>
                VinFast {m.name}
              </option>
            ))}
            {vehicleModelsList.length === 0 &&
              ['VF 3', 'VF 5', 'VF e34', 'VF 6 Eco', 'VF 6 Plus', 'VF 7 Eco', 'VF 7 Plus', 'VF 8 Eco', 'VF 8 Plus', 'VF 9 Eco', 'VF 9 Plus'].map((m) => (
                <option key={m} value={m}>
                  VinFast {m}
                </option>
              ))}
          </select>

          {/* Add New Battery Button */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition shadow-sm active:scale-95 shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Thêm pin mới</span>
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div role="status" className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          {success}
        </div>
      )}

      {loading ? (
        <div className="grid min-h-64 place-items-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      ) : data?.items.length ? (
        <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/80 text-[11px] font-extrabold uppercase tracking-wider text-slate-600 dark:bg-slate-800/80 dark:text-slate-300 border-b border-slate-200/80 dark:border-slate-800">
              <tr>
                <th className="py-3 px-3.5">Mã pin</th>
                <th className="py-3 px-3">Loại pin</th>
                <th className="py-3 px-3 text-center">SOH</th>
                <th className="py-3 px-3 text-center">SOC</th>
                <th className="py-3 px-3">An toàn</th>
                <th className="py-3 px-3">Trạng thái</th>
                <th className="py-3 px-3 text-center">Giữ chỗ</th>
                <th className="py-3 px-3">Xe tương thích</th>
                <th className="py-3 px-3">Cập nhật</th>
                <th className="py-3 px-3 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
              {data.items.map((b: any) => (
                <tr className="transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/40" key={b.id}>
                  <td className="py-3 px-3.5 font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5">
                      <span>{b.serialNumber || b.batteryCode}</span>
                      <button
                        title="Xem & Tải mã QR Pin"
                        onClick={() => setQrModalBattery(b)}
                        className="inline-flex items-center rounded-md p-1 text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/50 transition"
                      >
                        <QrCode className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                  <td className="py-3 px-3 font-semibold whitespace-nowrap text-slate-600 dark:text-slate-300">
                    {formatBatteryTypeLabel(b.batteryType, b.type)}
                  </td>
                  <td className="py-3 px-3 font-extrabold text-center text-emerald-600 dark:text-emerald-400">
                    {b.soh}%
                  </td>
                  <td className="py-3 px-3 font-bold text-center">
                    {b.soc}%
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    <Badge variant={b.safetyState === 'SAFE' ? 'success' : b.safetyState === 'UNSAFE' ? 'error' : 'warning'}>
                      {stationStatusLabel(b.safetyState)}
                    </Badge>
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    {b.operationalStatus === 'INSTALLED' ? (
                      <Badge variant="info">{stationStatusLabel(b.operationalStatus)}</Badge>
                    ) : b.operationalStatus === 'REMOVED' ? (
                      <Badge variant="warning">{stationStatusLabel(b.operationalStatus)}</Badge>
                    ) : b.operationalStatus === 'RETIRED' ? (
                      <Badge variant="gray">{stationStatusLabel(b.operationalStatus)}</Badge>
                    ) : b.operationalStatus === 'AVAILABLE' ? (
                      <Badge variant="success">{stationStatusLabel(b.operationalStatus)}</Badge>
                    ) : (
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{stationStatusLabel(b.operationalStatus)}</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-center whitespace-nowrap">
                    {b.reservations?.length ? (
                      <span className="text-amber-600 font-bold">Đang giữ</span>
                    ) : (
                      <span className="text-slate-400">Không</span>
                    )}
                  </td>
                  <td className="py-3 px-3 max-w-[200px] truncate text-slate-600 dark:text-slate-400" title={getCompatibleVehicles(b)}>
                    {getCompatibleVehicles(b)}
                  </td>
                  <td className="py-3 px-3 text-[11px] text-slate-500 whitespace-nowrap">
                    {new Date(b.updatedAt).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                  <td className="py-3 px-3 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1">
                      <button
                        title="Xem & Tải mã QR Pin"
                        onClick={() => setQrModalBattery(b)}
                        className="rounded-lg border border-slate-200 p-1.5 text-emerald-600 hover:bg-emerald-50 dark:border-slate-700 dark:text-emerald-400 dark:hover:bg-emerald-950/40 transition"
                      >
                        <QrCode className="h-3.5 w-3.5" />
                      </button>
                      <button
                        title="Chi tiết"
                        onClick={() => setSelected(b)}
                        className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>

                      {b.operationalStatus !== 'RETIRED'
                        && b.status !== 'RETIRED'
                        && b.operationalStatus !== 'INSTALLED'
                        && b.operationalStatus !== 'REMOVED'
                        && (
                        <>
                          <button
                            title="Bảo trì"
                            disabled={busy}
                            onClick={() => openAction('MAINTENANCE', b)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-amber-700 hover:bg-amber-50 dark:border-slate-700 dark:text-amber-400 dark:hover:bg-amber-950/40 transition disabled:opacity-50"
                          >
                            <Wrench className="h-3 w-3" />
                            <span>Bảo trì</span>
                          </button>
                          <button
                            title="Chuyển pin sang trạng thái ngừng sử dụng"
                            disabled={busy}
                            onClick={() => openAction('RETIRE', b)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 dark:border-slate-700 dark:text-rose-400 dark:hover:bg-rose-950/40 transition disabled:opacity-50"
                          >
                            <Trash2 className="h-3 w-3" />
                            <span>Ngừng sử dụng</span>
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="app-panel flex flex-col items-center justify-center p-12 text-center border-dashed rounded-2xl">
          <Battery className="h-10 w-10 text-slate-400" />
          <h3 className="mt-3 text-base font-bold text-slate-900 dark:text-white">Không có pin phù hợp bộ lọc</h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Bấm nút "Thêm pin mới" ở trên để nhập pin mới vào kho của trạm.</p>
        </div>
      )}

      {data && (
        <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 px-1">
          <span>Hiển thị <strong>{data.items?.length || 0}</strong> / <strong>{data.total || 0}</strong> pin</span>
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

      {/* Modal Chi tiết Pin */}
      <Modal
        isOpen={!!selected}
        onClose={() => setSelected(undefined)}
        title="Chi tiết pin"
        footer={
          <Button variant="outline" onClick={() => setSelected(undefined)}>
            Đóng
          </Button>
        }
      >
        <div className="grid gap-3 text-sm text-slate-800 dark:text-slate-200 sm:grid-cols-2">
          {selected && (
            <>
              <p><span className="font-bold">Mã pin:</span> {selected.serialNumber || selected.batteryCode || selected.id}</p>
              <p><span className="font-bold">Loại pin:</span> {formatBatteryTypeLabel(selected.batteryType, selected.type)}</p>
              <p><span className="font-bold">Xe tương thích:</span> {getCompatibleVehicles(selected)}</p>
              <p><span className="font-bold">Sức khỏe pin:</span> {selected.soh ?? '—'}%</p>
              <p><span className="font-bold">Mức pin:</span> {selected.soc ?? '—'}%</p>
              <p><span className="font-bold">Mức an toàn:</span> {stationStatusLabel(selected.safetyState)}</p>
              <p><span className="font-bold">Trạng thái vận hành:</span> {stationStatusLabel(selected.operationalStatus)}</p>
              <p><span className="font-bold">Cập nhật lần cuối:</span> {selected.updatedAt ? new Date(selected.updatedAt).toLocaleString('vi-VN') : '—'}</p>
              {selected.operationalStatus === 'INSTALLED' && selected.vehicleAssignments?.[0]?.vehicle && (() => {
                const vehicle = selected.vehicleAssignments[0].vehicle;
                const owner = vehicle.user;
                return (
                  <div className="sm:col-span-2 mt-2 rounded-xl border border-blue-200 bg-blue-50/70 p-4 dark:border-blue-900/50 dark:bg-blue-950/30">
                    <h3 className="font-black text-blue-800 dark:text-blue-300">Thông tin xe đang gắn pin</h3>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <p><span className="font-bold">Tên xe:</span> {vehicle.name || '—'}</p>
                      <p><span className="font-bold">Biển số:</span> {vehicle.plateNumber || '—'}</p>
                      <p><span className="font-bold">Số VIN:</span> {vehicle.vinNumber || '—'}</p>
                      <p>
                        <span className="font-bold">Dòng xe:</span>{' '}
                        {vehicle.vehicleModel
                          ? `${vehicle.vehicleModel.manufacturer} ${vehicle.vehicleModel.name}`
                          : [vehicle.brand, vehicle.model].filter(Boolean).join(' ') || '—'}
                      </p>
                    </div>
                    <h3 className="mt-4 border-t border-blue-200 pt-3 font-black text-blue-800 dark:border-blue-900/50 dark:text-blue-300">Chủ xe</h3>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <p><span className="font-bold">Họ tên:</span> {owner?.fullName || '—'}</p>
                      <p><span className="font-bold">Số điện thoại:</span> {owner?.phone || '—'}</p>
                      <p className="sm:col-span-2"><span className="font-bold">Email:</span> {owner?.email || '—'}</p>
                    </div>
                  </div>
                );
              })()}
            </>
          )}
        </div>
      </Modal>

      {/* Modal Hành động (Bảo trì / Kiểm tra / Ngừng sử dụng) */}
      <Modal
        isOpen={!!action}
        onClose={() => setAction(undefined)}
        title={
          action === 'INSPECTION_REQUIRED'
            ? 'Đánh dấu cần kiểm tra pin'
            : action === 'MAINTENANCE'
            ? 'Gửi pin đi bảo trì'
            : 'Chuyển pin sang trạng thái ngừng sử dụng'
        }
        footer={
          <>
            <Button variant="outline" onClick={() => setAction(undefined)}>
              Hủy
            </Button>
            <Button
              variant={action === 'RETIRE' ? 'danger' : 'primary'}
              loading={busy}
              onClick={() => void submit()}
            >
              {action === 'RETIRE' ? 'Xác nhận ngừng sử dụng' : 'Xác nhận'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {action === 'RETIRE' && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300 font-medium">
              <p className="font-bold text-amber-900 dark:text-amber-200">Pin vẫn được giữ lại trong hệ thống</p>
              <p className="mt-0.5">
                Thao tác này chỉ chuyển pin sang trạng thái <strong>Ngừng sử dụng</strong>. Mọi thông tin và lịch sử của pin vẫn được lưu giữ trong kho trạm.
              </p>
            </div>
          )}

          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
            Mã pin
            <input
              disabled
              className={`${inputStyle} mt-1.5 w-full font-mono bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 cursor-not-allowed`}
              value={batteryId}
            />
          </label>
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
            Lý do (Tối thiểu 3 ký tự)
            <textarea
              className={`${inputStyle} mt-1.5 min-h-[80px] w-full`}
              placeholder={action === 'RETIRE' ? 'Nhập lý do ngừng sử dụng pin...' : 'Nhập lý do thực hiện thao tác này...'}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
        </div>
      </Modal>

      <AddNewBatteryModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        defaultStationId={stationId}
        onSuccess={() => {
          void load();
        }}
      />

      {/* Modal Xem & Tải Mã QR Pin */}
      <Modal
        isOpen={!!qrModalBattery}
        onClose={() => setQrModalBattery(undefined)}
        title="Mã QR Pin Kho Trạm"
      >
        {qrModalBattery && (
          <div className="flex flex-col items-center justify-center p-4 text-center">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700">
              <QRCodeSVG
                value={qrModalBattery.qrCodeValue || qrModalBattery.batteryCode || qrModalBattery.serialNumber || qrModalBattery.id}
                size={220}
                id="inventory-qr-svg"
              />
            </div>

            <div className="mt-4 flex items-center justify-center gap-2">
              <span className="font-mono text-sm font-bold text-slate-900 dark:text-white">
                {qrModalBattery.batteryCode || qrModalBattery.serialNumber}
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(qrModalBattery.qrCodeValue || qrModalBattery.batteryCode || qrModalBattery.serialNumber);
                  setCopiedQr(true);
                  setTimeout(() => setCopiedQr(false), 2000);
                }}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 transition"
                title="Sao chép mã QR"
              >
                {copiedQr ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Tải ảnh mã QR này về máy để quét đối chiếu khi thực hiện quy trình đổi pin.
            </p>

            <div className="mt-6 flex w-full justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
              <Button variant="primary" size="sm" onClick={() => handleDownloadQr(qrModalBattery)}>
                <Download className="mr-1.5 h-4 w-4" />
                Tải ảnh QR (PNG)
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
