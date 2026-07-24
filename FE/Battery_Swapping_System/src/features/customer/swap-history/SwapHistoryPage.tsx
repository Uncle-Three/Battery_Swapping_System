import { ChevronLeft, ChevronRight, History as HistoryIcon, Inbox, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type FC } from 'react';
import { getApiErrorMessage } from '../../../services/apiClient';
import { swapHistoryService } from '../../../services/swapHistoryService';
import { SwapHistoryDetailModal } from './SwapHistoryDetailModal';
import { SwapHistoryFilters } from './SwapHistoryFilters';
import { SwapHistoryMobileCard } from './SwapHistoryMobileCard';
import { SwapHistoryTable } from './SwapHistoryTable';
import { EMPTY_SWAP_FILTERS, type SwapHistoryFiltersValue, type SwapHistoryItem } from './swapHistoryTypes';

const PAGE_SIZE = 10;

export const SwapHistoryPage: FC = () => {
  const [swaps, setSwaps] = useState<SwapHistoryItem[]>([]);
  const [filters, setFilters] = useState<SwapHistoryFiltersValue>(EMPTY_SWAP_FILTERS);
  const [selected, setSelected] = useState<SwapHistoryItem | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setSwaps(await swapHistoryService.list());
    } catch (cause) {
      setError(getApiErrorMessage(cause) || 'Không thể tải lịch sử đổi pin. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const stations = useMemo(() => Array.from(
    new Map(swaps.map((swap) => [swap.station.id ?? swap.station.name, {
      id: swap.station.id ?? swap.station.name,
      name: swap.station.name,
    }])).values(),
  ), [swaps]);

  const filtered = useMemo(() => {
    const query = filters.query.trim().toLocaleLowerCase('vi-VN').replace(/\s/g, '');
    const from = filters.fromDate ? new Date(`${filters.fromDate}T00:00:00`).getTime() : null;
    const to = filters.toDate ? new Date(`${filters.toDate}T23:59:59.999`).getTime() : null;
    return swaps.filter((swap) => {
      const searchable = `${swap.code} ${swap.vehicle.licensePlate}`.toLocaleLowerCase('vi-VN').replace(/\s/g, '');
      const timestamp = new Date(swap.startedAt).getTime();
      return (!query || searchable.includes(query))
        && (!filters.status || swap.status === filters.status)
        && (!filters.stationId || (swap.station.id ?? swap.station.name) === filters.stationId)
        && (from === null || timestamp >= from)
        && (to === null || timestamp <= to);
    });
  }, [filters, swaps]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hasFilters = Object.values(filters).some(Boolean);

  const updateFilters = (next: SwapHistoryFiltersValue) => {
    setFilters(next);
    setPage(1);
  };
  const closeDetail = useCallback(() => setSelected(null), []);

  return (
    <div className="flex flex-col gap-5 text-left">
      <header className="flex items-start gap-3">
        <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600">
          <HistoryIcon aria-hidden className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Lịch sử đổi pin</h1>
          <p className="mt-1 text-sm text-slate-500">Xem lại các giao dịch đổi pin, thông tin pin, chi phí và hóa đơn.</p>
        </div>
      </header>

      <SwapHistoryFilters
        value={filters}
        stations={stations}
        onChange={updateFilters}
        onReset={() => updateFilters(EMPTY_SWAP_FILTERS)}
      />

      {loading ? (
        <div role="status" className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <RefreshCw aria-hidden className="mx-auto h-6 w-6 animate-spin text-emerald-600" />
          <p className="mt-3 text-sm font-medium text-slate-600">Đang tải lịch sử đổi pin...</p>
        </div>
      ) : error ? (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="font-semibold text-red-800">Không thể tải lịch sử đổi pin. Vui lòng thử lại.</p>
          <p className="mt-1 text-sm text-red-600">{error}</p>
          <button type="button" onClick={() => void load()} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-red-500">
            <RefreshCw className="h-4 w-4" /> Thử lại
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <Inbox aria-hidden className="mx-auto h-8 w-8 text-slate-400" />
          <h2 className="mt-3 font-semibold text-slate-800">{hasFilters ? 'Không tìm thấy giao dịch phù hợp với bộ lọc.' : 'Chưa có giao dịch đổi pin'}</h2>
          {!hasFilters && <p className="mt-1 text-sm text-slate-500">Các lần đổi pin của bạn sẽ xuất hiện tại đây.</p>}
        </div>
      ) : (
        <>
          <p aria-live="polite" className="text-sm text-slate-500">Tìm thấy <span className="font-semibold text-slate-700">{filtered.length}</span> giao dịch</p>
          <SwapHistoryTable swaps={visible} onView={setSelected} />
          <div className="grid gap-3 xl:hidden">
            {visible.map((swap) => <SwapHistoryMobileCard key={swap.id} swap={swap} onView={setSelected} />)}
          </div>
          {totalPages > 1 && (
            <nav aria-label="Phân trang lịch sử đổi pin" className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-sm text-slate-500">Trang <span className="font-semibold text-slate-800">{page}</span> / {totalPages}</p>
              <div className="flex gap-2">
                <button type="button" aria-label="Trang trước" disabled={page === 1} onClick={() => setPage((current) => current - 1)} className="rounded-lg border border-slate-200 p-2 text-slate-600 disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-emerald-500"><ChevronLeft className="h-4 w-4" /></button>
                <button type="button" aria-label="Trang sau" disabled={page === totalPages} onClick={() => setPage((current) => current + 1)} className="rounded-lg border border-slate-200 p-2 text-slate-600 disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-emerald-500"><ChevronRight className="h-4 w-4" /></button>
              </div>
            </nav>
          )}
        </>
      )}

      <SwapHistoryDetailModal swap={selected} onClose={closeDetail} />
    </div>
  );
};

export default SwapHistoryPage;
