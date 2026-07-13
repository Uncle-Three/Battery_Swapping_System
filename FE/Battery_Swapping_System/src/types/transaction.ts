export interface Booking {
  id: string;
  userId: string;
  stationId: string;
  stationName: string;
  slotNumber?: number;
  batteryId?: string;
  vehicleId?: string;
  slotId?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  mandatory?: boolean;
  priority?: number;
  costEstimate?: number;
  status: 'CREATED' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'RESCHEDULE_PROPOSED' | 'RESCHEDULED' | 'CHECKED_IN' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';
  expiryTime: string;
  createdAt: string;
  rescheduleProposal?: { slotId: string; scheduledStart: string; scheduledEnd: string; reason: string } | null;
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
  workflowStatus: string;
  createdAt: string;
  completedAt?: string;
  failureReason?: string;
  // Rich includes from Phase 6 backend
  station?: { id: string; name: string; address: string };
  vehicle?: { id: string; name: string; plateNumber: string };
  batteryIn?: { id: string; serialNumber: string; soc: number; soh: number; temperature?: number; voltage?: number };
  batteryOut?: { id: string; serialNumber: string; soc: number; soh: number };
  inspection?: {
    id: string;
    soc: number;
    soh: number;
    temperature?: number;
    voltage?: number;
    physicalCondition: string;
    outcome: string;
    notes?: string;
    createdAt: string;
  } | null;
  invoice?: { id: string; amount: number; paymentMethod: string; status: string; createdAt: string } | null;
  payments?: { id: string; amount: number; paymentMethod: string; status: string; createdAt: string }[];
  stepHistory?: { id: string; fromStatus?: string; toStatus: string; createdAt: string }[];
  booking?: { id: string } | null;
}

export interface Invoice {
  id: string;
  transactionId: string;
  amount: number;
  paymentMethod: string;
  status: 'PAID' | 'UNPAID';
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  status: 'UNREAD' | 'READ' | 'ARCHIVED';
  entityType?: string;
  entityId?: string;
  readAt?: string;
  createdAt: string;
}

export interface BookingPaymentStatus {
  booking: {
    id: string;
    status: string;
    costEstimate?: number;
    stationId: string;
  };
  swap?: {
    id: string;
    workflowStatus: string;
    cost?: number;
    invoice?: { id: string; amount: number; paymentMethod: string; status: string } | null;
    payments?: { id: string; amount: number; paymentMethod: string; status: string; createdAt: string }[];
  } | null;
}
