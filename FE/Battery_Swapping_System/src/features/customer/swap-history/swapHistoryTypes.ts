export type SwapStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'FAILED';
export type SwapPaymentStatus = 'NOT_REQUIRED' | 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';

export interface SwapHistoryBattery {
  id?: string;
  code: string;
  serialNumber?: string | null;
  batteryType?: string | null;
  soc: number | null;
  soh: number | null;
  recordedAt?: string | null;
}

export interface SwapHistoryItem {
  id: string;
  code: string;
  station: { id?: string; name: string; shortAddress?: string | null };
  vehicle: { id?: string; model: string; licensePlate: string };
  staffName?: string | null;
  oldBattery: SwapHistoryBattery | null;
  replacementBattery: SwapHistoryBattery | null;
  amount: number;
  discountAmount: number;
  finalAmount: number;
  status: SwapStatus;
  paymentStatus: SwapPaymentStatus;
  paymentMethod?: string | null;
  paymentCode?: string | null;
  invoiceId?: string | null;
  failureReason?: string | null;
  failedStep?: string | null;
  failedAt?: string | null;
  cancellationReason?: string | null;
  startedAt: string;
  completedAt?: string | null;
}

export interface SwapHistoryFiltersValue {
  query: string;
  status: SwapStatus | '';
  stationId: string;
  fromDate: string;
  toDate: string;
}

export const EMPTY_SWAP_FILTERS: SwapHistoryFiltersValue = {
  query: '',
  status: '',
  stationId: '',
  fromDate: '',
  toDate: '',
};
