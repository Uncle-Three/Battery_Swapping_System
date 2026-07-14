export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

export type BookingEmailData = {
  customerName: string;
  customerEmail: string;
  stationName?: string | null;
  vehicleName?: string | null;
  plateNumber?: string | null;
  scheduledStart?: Date | string | null;
  reason?: string | null;
};

export type BatteryInspectionEmailData = {
  customerName: string;
  customerEmail: string;
  serialNumber: string;
  soc: number;
  soh: number;
  temperature?: number;
  voltage?: number;
  physicalCondition: string;
  outcome: string;
  notes?: string | null;
};

export type MaintenanceEmailData = {
  customerName: string;
  customerEmail: string;
  serialNumber?: string | null;
  status: string;
  notes?: string | null;
};

export type SwapCompletedEmailData = {
  customerName: string;
  customerEmail: string;
  stationName?: string | null;
  vehicleName?: string | null;
  plateNumber?: string | null;
  oldBatterySerial?: string | null;
  newBatterySerial?: string | null;
  amount: number;
  completedAt?: Date | string | null;
};
