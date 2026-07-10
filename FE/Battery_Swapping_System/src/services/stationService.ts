import apiClient from './apiClient';
import { API_ENDPOINTS } from '../constants/endpoints';
import type { Station } from '../types';

export const stationService = {
  getStations: async (): Promise<Station[]> => {
    // const response = await apiClient.get(API_ENDPOINTS.STATIONS.LIST);
    // return response.data;

    // Mock Stations data
    return [
      {
        id: 'st-1',
        name: 'Trạm Sạc GreenCharge Quận 1',
        address: '120 Lê Lai, Phường Bến Thành, Quận 1, TP. HCM',
        latitude: 10.7719,
        longitude: 106.6917,
        status: 'ACTIVE',
        slots: [
          { id: 'sl-1', slotNumber: 1, status: 'READY', battery: { id: 'b-1', serialNumber: 'B001', soc: 98, soh: 95, temperature: 35, voltage: 48, status: 'READY', lastUpdated: new Date().toISOString() } },
          { id: 'sl-2', slotNumber: 2, status: 'CHARGING', battery: { id: 'b-2', serialNumber: 'B002', soc: 45, soh: 92, temperature: 42, voltage: 46, status: 'CHARGING', lastUpdated: new Date().toISOString() } },
          { id: 'sl-3', slotNumber: 3, status: 'EMPTY' },
        ],
      },
      {
        id: 'st-2',
        name: 'Trạm Sạc GreenCharge Quận 7',
        address: '56 Nguyễn Thị Thập, Tân Hưng, Quận 7, TP. HCM',
        latitude: 10.7412,
        longitude: 106.7013,
        status: 'ACTIVE',
        slots: [
          { id: 'sl-4', slotNumber: 1, status: 'READY', battery: { id: 'b-3', serialNumber: 'B003', soc: 100, soh: 97, temperature: 33, voltage: 48, status: 'READY', lastUpdated: new Date().toISOString() } },
          { id: 'sl-5', slotNumber: 2, status: 'MAINTENANCE', battery: { id: 'b-4', serialNumber: 'B004', soc: 10, soh: 60, temperature: 55, voltage: 40, status: 'MAINTENANCE', lastUpdated: new Date().toISOString() } },
          { id: 'sl-6', slotNumber: 3, status: 'READY', battery: { id: 'b-5', serialNumber: 'B005', soc: 99, soh: 96, temperature: 34, voltage: 48, status: 'READY', lastUpdated: new Date().toISOString() } },
        ],
      },
    ] as any;
  },

  getStationDetails: async (id: string): Promise<Station> => {
    const response = await apiClient.get(API_ENDPOINTS.STATIONS.DETAILS(id));
    return response.data;
  },

  getStationSlots: async (id: string) => {
    const response = await apiClient.get(API_ENDPOINTS.STATIONS.SLOTS(id));
    return response.data;
  },
};
