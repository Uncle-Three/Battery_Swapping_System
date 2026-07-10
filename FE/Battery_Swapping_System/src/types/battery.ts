import { BatteryStatus, SlotStatus } from '../constants/battery';

export interface Battery {
  id: string;
  serialNumber: string;
  soc: number; // State of Charge (%)
  soh: number; // State of Health (%)
  temperature: number; // In Celsius
  voltage: number;
  status: BatteryStatus;
  lastUpdated: string;
}

export interface BatterySlot {
  id: string;
  slotNumber: number;
  status: SlotStatus;
  battery?: Battery;
}

export interface Station {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  slots: BatterySlot[];
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
}
