import type { ServiceBay } from '../../../services/stationDetailService';

export type SlotStatus =
  | 'AVAILABLE'
  | 'OFF'
  | 'RESERVED'
  | 'CHECKED_IN'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'BLOCKED'
  | 'CANCELLED'
  | 'EXPIRED';

export interface PreviewSlot {
  bayId: string;
  bayCode: string;
  bayName: string;
  date: string;
  startTime: string;
  endTime: string;
  status: SlotStatus;
  reason?: string;
  backendId?: string;
  bookingId?: string | null;
  bufferMinutes?: number | null;
  cooldownEndsAt?: string | null;
}

export interface SlotGenerationValues {
  dateFrom: string;
  dateTo: string;
  daysOfWeek: number[];
  openingTime: string;
  closingTime: string;
  slotDurationMinutes: number;
  bufferMinutes: number;
  selectedBayIds: string[];
}

export interface BulkSlotPayload extends Omit<SlotGenerationValues, 'selectedBayIds'> {
  stationId: string;
  slots: Array<Pick<PreviewSlot, 'bayId' | 'date' | 'startTime' | 'endTime' | 'status' | 'reason'>>;
}

export type BayStatus = ServiceBay['status'];
