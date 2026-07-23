export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
<<<<<<< HEAD
  html?: string;
};

export type EmailDeliveryResult = {
  sent: boolean;
  skipped: boolean;
  messageId?: string;
};

export type EmailVerificationData = {
  customerName: string;
  customerEmail: string;
  verificationUrl: string;
  expiresMinutes: number;
};

export type PaymentEmailData = {
  customerName: string;
  customerEmail: string;
  amount: number;
  paymentUrl?: string | null;
  reason?: string | null;
=======
  html: string;
>>>>>>> c1e66c0b73c4c02a2d09fc6d7459f123759cc74f
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
<<<<<<< HEAD
=======


>>>>>>> c1e66c0b73c4c02a2d09fc6d7459f123759cc74f
