import { useEffect, useState, type FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { stationService } from '../../../services/stationService';
import type { Station } from '../../../types';
import { StationCard } from '../components/StationCard';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { useBookingStore } from '../../../store/bookingStore';
import { useAuth } from '../../../hooks/useAuth';
import { LoadingSpinner } from '../../../components/feedback/LoadingSpinner';

export const Stations: FC = () => {
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [isOpenModal, setIsOpenModal] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { setSelectedStation: setBookingStation } = useBookingStore();

  useEffect(() => {
    stationService.getStations()
      .then((data) => {
        setStations(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching stations:', err);
        setLoading(false);
      });
  }, []);

  const handleSelectStation = (station: Station) => {
    setSelectedStation(station);
    setIsOpenModal(true);
  };

  const handleBookRedirect = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (selectedStation) {
      setBookingStation(selectedStation);
      navigate('/booking');
    }
  };

  if (loading) {
    return <LoadingSpinner size="lg" label="Đang tải danh sách trạm sạc..." />;
  }

  return (
    <div className="flex flex-col gap-6 text-left">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Danh sách trạm sạc khả dụng
        </h1>
        <p className="text-sm text-slate-550 dark:text-slate-400 mt-1">
          Lựa chọn trạm sạc phù hợp nhất để xem thông tin chi tiết hoặc đặt chỗ trước.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {stations.map((station) => (
          <StationCard
            key={station.id}
            station={station}
            onSelect={handleSelectStation}
          />
        ))}
      </div>

      {selectedStation && (
        <Modal
          isOpen={isOpenModal}
          onClose={() => setIsOpenModal(false)}
          title={selectedStation.name}
          footer={
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsOpenModal(false)}>
                Đóng
              </Button>
              <Button variant="primary" onClick={handleBookRedirect}>
                Đặt giữ slot pin
              </Button>
            </div>
          }
        >
          <div className="flex flex-col gap-4">
            <div>
              <h4 className="text-xs font-semibold text-slate-550 dark:text-slate-400 uppercase">Địa chỉ</h4>
              <p className="text-sm font-medium mt-0.5">{selectedStation.address}</p>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-slate-550 dark:text-slate-400 uppercase">Tọa độ trạm</h4>
              <p className="text-sm font-medium mt-0.5">
                Vĩ độ: {selectedStation.latitude}, Kinh độ: {selectedStation.longitude}
              </p>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-slate-555 dark:text-slate-400 uppercase mb-2">Trạng thái slot cắm</h4>
              <div className="grid grid-cols-3 gap-2">
                {selectedStation.slots.map((slot) => (
                  <div
                    key={slot.id}
                    className={`p-3 rounded-lg border text-center ${
                      slot.status === 'READY'
                        ? 'border-green-200 bg-green-50 dark:border-green-900/30 dark:bg-green-950/20'
                        : slot.status === 'CHARGING'
                        ? 'border-yellow-250 bg-yellow-50 dark:border-yellow-900/30 dark:bg-yellow-950/20'
                        : 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900'
                    }`}
                  >
                    <span className="block text-xs text-slate-500">Slot {slot.slotNumber}</span>
                    <span className="text-xs font-bold capitalize">
                      {slot.status === 'READY'
                        ? `Sẵn sàng (${slot.battery?.soc}%)`
                        : slot.status === 'CHARGING'
                        ? `Đang sạc (${slot.battery?.soc}%)`
                        : 'Trống'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
