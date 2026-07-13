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
  code: string;
  name: string;
  description?: string;
  phone?: string;
  email?: string;
  country?: string;
  province?: string;
  district?: string;
  ward?: string;
  address: string;
  latitude: number;
  longitude: number;
  openingTime?: string;
  closingTime?: string;
  workingDays?: string[];
  holidaySupport?: boolean;
  maintenanceDay?: string;
  serviceBaysCount?: number;
  maxVehiclesPerSlot?: number;
  defaultSlotDuration?: number;
  allowParallelReplacement?: boolean;
  supportedVehicleModelIds?: string[];
  supportedBatteryTypeIds?: string[];
  slots: BatterySlot[];
  status: 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
}
