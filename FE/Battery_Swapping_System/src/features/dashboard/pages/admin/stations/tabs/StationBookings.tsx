import { useCallback, useEffect, useState, type FC } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, CalendarDays, Loader2, Search } from 'lucide-react';
import { Badge } from '../../../../../../components/ui/Badge';
import { Button } from '../../../../../../components/ui/Button';
import { getApiErrorMessage } from '../../../../../../services/apiClient';
import { stationBookingService } from '../../../../../../services/stationDetailService';
import { stationStatusLabel } from '../stationStatusLabels';

export const StationBookings: FC = () => {
  const { stationId = '' } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<any>();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [date, setDate] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const from = date ? new Date(`${date}T00:00:00`).toISOString() : undefined;
      const to = date ? new Date(`${date}T23:59:59`).toISOString() : undefined;
      setData(await stationBookingService.list(stationId, { search: search || undefined, status: status || undefined, from, to, page, limit: 20 }));
    } catch (cause) {
      setError(getApiErrorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, [stationId, search, status, date, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const inputStyle = 'rounded-xl border border-slate-200 bg-white py-2 text-sm font-semibold text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white focus:outline-none';

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white">Lịch đặt chỗ</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Chỉ hiển thị lịch thay pin thuộc trạm hiện tại.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              className={`${inputStyle} pl-9 pr-3`}
              placeholder="Mã, người dùng, xe…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <input
            aria-label="Ngày thay pin"
            type="date"
            className={`${inputStyle} px-3`}
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setPage(1);
            }}
          />
          <select
            aria-label="Trạng thái lịch thay pin"
            className={`${inputStyle} px-3`}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Mọi trạng thái</option>
            {['PENDING_APPROVAL', 'APPROVED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'REJECTED'].map((x) => (
              <option key={x} value={x}>
                {stationStatusLabel(x)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div role="alert" className="flex items-center gap-2 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm font-semibold text-rose-600 dark:text-rose-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="grid min-h-64 place-items-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      ) : data?.items.length ? (
        <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="min-w-[1300px] w-full text-left text-sm">
            <thead className="bg-slate-100 text-xs font-extrabold uppercase text-slate-600 dark:bg-slate-800/80 dark:text-slate-300">
              <tr>
                {['Mã booking', 'Người dùng', 'Xe', 'Pin hiện tại', 'Bắt buộc', 'Ưu tiên', 'Ngày thay', 'Khung giờ', 'Slot', 'Khoang', 'Trạng thái', 'Phê duyệt', 'Tạo lúc', ''].map((x) => (
                  <th className="p-3.5" key={x}>
                    {x}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
              {data.items.map((b: any) => (
                <tr key={b.id} className="transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="p-3.5 font-mono font-bold">{b.bookingCode || b.id}</td>
                  <td className="p-3.5">
                    <strong className="text-slate-900 dark:text-white">{b.user?.fullName}</strong>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{b.user?.email}</div>
                  </td>
                  <td className="p-3.5">
                    <div>{b.vehicle?.name || b.vehicle?.model || '—'}</div>
                    <div className="text-xs text-slate-500">{b.vehicle?.plateNumber}</div>
                    <div className="text-xs font-bold text-slate-500">{b.vehicle?.batteryType || ''}</div>
                  </td>
                  <td className="p-3.5">{stationStatusLabel(b.battery?.operationalStatus || b.battery?.safetyState)}</td>
                  <td className="p-3.5">{b.mandatory ? 'Có' : 'Không'}</td>
                  <td className="p-3.5">{b.priority ?? '—'}</td>
                  <td className="p-3.5">{b.scheduledStart ? new Date(b.scheduledStart).toLocaleDateString('vi-VN') : '—'}</td>
                  <td className="p-3.5">{b.scheduledStart ? new Date(b.scheduledStart).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                  <td className="p-3.5">{b.slot?.slotNumber ? `Slot ${b.slot.slotNumber}` : '—'}</td>
                  <td className="p-3.5">{b.serviceBay?.bayCode || b.bay?.bayCode || '—'}</td>
                  <td className="p-3.5">
                    <Badge variant={b.status === 'COMPLETED' ? 'success' : b.status === 'CANCELLED' || b.status === 'REJECTED' ? 'error' : 'warning'}>
                      {stationStatusLabel(b.status)}
                    </Badge>
                  </td>
                  <td className="p-3.5">{stationStatusLabel(b.approvalHistory?.[0]?.action)}</td>
                  <td className="p-3.5">{new Date(b.createdAt).toLocaleString('vi-VN')}</td>
                  <td className="p-3.5">
                    <Button size="sm" variant="outline" onClick={() => navigate(`/admin/stations/${stationId}/bookings/${b.id}`)}>
                      Chi tiết
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="app-panel flex flex-col items-center justify-center p-12 text-center border-dashed">
          <CalendarDays className="h-10 w-10 text-slate-400" />
          <h3 className="mt-3 text-lg font-bold text-slate-900 dark:text-white">Không có booking phù hợp</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Thay đổi bộ lọc tìm kiếm hoặc từ khóa để xem kết quả khác.</p>
        </div>
      )}

      {data && (
        <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
          <span>{data.total} booking</span>
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
    </div>
  );
};
