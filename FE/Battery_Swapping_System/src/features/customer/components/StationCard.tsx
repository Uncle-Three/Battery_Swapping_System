import { type FC } from 'react';
import type { Station } from '../../../types';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { MapPin, Battery } from 'lucide-react';

interface StationCardProps {
  station: Station;
  onSelect: (station: Station) => void;
}

export const StationCard: FC<StationCardProps> = ({ station, onSelect }) => {
  const slots = station.slots || [];
  const readyBatteriesCount = slots.filter((slot: any) => slot.status === 'READY').length;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-all">
      <div>
        <div className="flex justify-between items-start gap-2 mb-2">
          <h3 className="font-bold text-lg text-slate-900 dark:text-slate-105">{station.name}</h3>
          <Badge variant={station.status === 'ACTIVE' ? 'success' : 'warning'}>
            {station.status === 'ACTIVE' ? 'Hoạt động' : 'Tạm dừng'}
          </Badge>
        </div>

        <p className="text-sm text-slate-550 dark:text-slate-400 flex items-center gap-1.5 mb-4">
          <MapPin className="h-4 w-4 text-slate-400 flex-shrink-0" />
          <span>{station.address}</span>
        </p>

        <div className="flex items-center gap-2 mb-6">
          <Battery className="h-5 w-5 text-green-600 dark:text-green-500" />
          <span className="text-sm">
            Số pin sẵn sàng: <strong className="text-green-600 font-semibold">{readyBatteriesCount}</strong> / {slots.length} slots
          </span>
        </div>
      </div>

      <Button
        onClick={() => onSelect(station)}
        disabled={station.status !== 'ACTIVE' || readyBatteriesCount === 0}
        variant="primary"
        className="w-full"
      >
        {readyBatteriesCount === 0 ? 'Hết pin sẵn sàng' : 'Đặt giữ slot pin'}
      </Button>
    </div>
  );
};
