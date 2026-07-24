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
  status: string;
  slots?: Array<{
    id: string;
    slotNumber: number;
    status: string;
    batteries?: Array<{ id: string; serialNumber: string; soc: number; soh: number }>;
  }>;
  totalBatteries?: number;
  availableBatteries?: number;
  createdAt?: string;
  updatedAt?: string;
}
