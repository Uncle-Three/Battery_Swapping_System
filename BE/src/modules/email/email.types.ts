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

export type WarrantyEmailData = {
  customerName: string;
  customerEmail: string;
  warrantyNumber: string;
  issuedAt: Date | string;
  expiresAt: Date | string;
  newBatterySerial?: string | null;
  vehicleName?: string | null;
  plateNumber?: string | null;
  stationName?: string | null;
};

export type SwapSummaryReportEmailData = {
  customerName: string;
  customerEmail: string;
  swapId: string;
  stationName: string;
  vehicleName?: string | null;
  plateNumber?: string | null;
  // Pin cũ & kiểm tra
  oldBatterySerial?: string | null;
  oldBatterySoh?: number | null;
  oldBatterySoc?: number | null;
  oldBatteryCondition?: string | null;
  oldBatteryOutcome?: string | null;
  // Pin mới & bảo hành
  newBatterySerial?: string | null;
  newBatterySoc?: number | null;
  warrantyNumber?: string | null;
  warrantyExpiresAt?: Date | string | null;
  // Thanh toán
  amount: number;
  paymentMethod: string;
  completedAt?: Date | string | null;
};


