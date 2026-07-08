export interface Booking {
  id: string;
  userId: string;
  stationId: string;
  stationName: string;
  slotNumber?: number;
  batteryId?: string;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';
  expiryTime: string;
  createdAt: string;
}

export interface SwapTransaction {
  id: string;
  userId: string;
  userName: string;
  stationId: string;
  stationName: string;
  batteryInId: string;
  batteryInSoc: number;
  batteryOutId: string;
  batteryOutSoc: number;
  cost: number;
  status: 'SUCCESS' | 'FAILED';
  createdAt: string;
}

export interface Invoice {
  id: string;
  transactionId: string;
  amount: number;
  paymentMethod: string;
  status: 'PAID' | 'UNPAID';
  createdAt: string;
}
