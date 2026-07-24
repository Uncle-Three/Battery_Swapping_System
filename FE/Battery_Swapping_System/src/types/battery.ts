export interface AddBatteryInput {
  code: string;
  serialNumber?: string;
  batteryTypeId: string;
  vehicleModelId?: string;
  manufacturer?: string;
  ratedCapacityAh?: number;
  ratedVoltage?: number;
  soc: number;
  manufacturedAt: string;
  receivedAt: string;
  stationId: string;
  storageLocation?: string;
  note?: string;
}

export interface BatteryType {
  id: string;
  code: string;
  manufacturer: string;
  chemistry?: string;
  connectorType?: string;
  nominalVoltage: number;
  capacityKWh: number;
  batteryClass?: string;
  compatibilities?: Array<{
    vehicleModelId?: string;
    vehicleModel: {
      id?: string;
      manufacturer: string;
      name: string;
    };
  }>;
}

export interface StationOption {
  id: string;
  code: string;
  name: string;
  address?: string;
}

export interface BatteryItem {
  id: string;
  code: string;
  serialNumber: string;
  batteryTypeId: string;
  manufacturer: string;
  ratedCapacityAh: number;
  ratedVoltage: number;
  soh: number;
  soc: number;
  cycleCount: number;
  accumulatedDistance: number;
  condition: string;
  status: string;
  stationId: string;
  storageLocation: string;
  manufacturedAt: string;
  receivedAt: string;
  note?: string;
  createdAt: string;
}
