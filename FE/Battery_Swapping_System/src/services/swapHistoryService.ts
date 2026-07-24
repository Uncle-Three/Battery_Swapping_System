import { API_ENDPOINTS } from '../constants/endpoints';
import type {
  SwapHistoryBattery,
  SwapHistoryItem,
  SwapPaymentStatus,
  SwapStatus,
} from '../features/customer/swap-history/swapHistoryTypes';
import apiClient, { unwrapData } from './apiClient';

type UnknownRecord = Record<string, unknown>;

const record = (value: unknown): UnknownRecord =>
  value && typeof value === 'object' ? value as UnknownRecord : {};

const text = (...values: unknown[]): string | null => {
  const value = values.find((entry) => typeof entry === 'string' && entry.trim());
  return typeof value === 'string' ? value : null;
};

const number = (...values: unknown[]): number | null => {
  const value = values.find((entry) => typeof entry === 'number' && Number.isFinite(entry));
  return typeof value === 'number' ? value : null;
};

export const extractBatteryCode = (value?: string | null): string | null => {
  if (!value) return null;
  try {
    const url = new URL(value);
    const queryCode = url.searchParams.get('batteryCode') || url.searchParams.get('code');
    if (queryCode) return queryCode.match(/BAT-[A-Z0-9-]+/i)?.[0]?.toUpperCase() ?? queryCode;
  } catch {
    // Legacy values may be plain text or contain a battery code inside another label.
  }
  return value.match(/BAT-[A-Z0-9-]+/i)?.[0]?.toUpperCase() ?? value;
};

const battery = (
  liveValue: unknown,
  snapshotValue: unknown,
  socFallback: unknown,
  recordedAt?: string | null,
): SwapHistoryBattery | null => {
  const live = record(liveValue);
  const snapshot = record(snapshotValue);
  const code = extractBatteryCode(text(
    snapshot.batteryCode,
    snapshot.code,
    live.batteryCode,
    live.code,
    snapshot.serialNumber,
    live.serialNumber,
    snapshot.qrCodeValue,
    live.qrCodeValue,
  ));
  if (!code && !text(live.id, snapshot.id)) return null;
  return {
    id: text(snapshot.id, live.id) ?? undefined,
    code: code ?? 'Chưa ghi nhận',
    serialNumber: text(snapshot.serialNumber, live.serialNumber),
    batteryType: text(snapshot.type, snapshot.batteryType, live.type, live.batteryType),
    soc: number(snapshot.soc, socFallback, live.soc),
    soh: number(snapshot.soh, live.soh),
    recordedAt,
  };
};

const normalizeStatus = (raw: UnknownRecord): SwapStatus => {
  const workflow = text(raw.workflowStatus)?.toUpperCase();
  const transaction = text(raw.status)?.toUpperCase();
  if (transaction === 'PENDING' || transaction === 'IN_PROGRESS' || transaction === 'COMPLETED' || transaction === 'CANCELLED') {
    return transaction;
  }
  if (transaction === 'FAILED' || workflow === 'FAILED') return 'FAILED';
  if (workflow === 'ROLLED_BACK') return 'CANCELLED';
  if (workflow === 'COMPLETED') return 'COMPLETED';
  if (!workflow || workflow === 'NOT_STARTED') return 'PENDING';
  return 'IN_PROGRESS';
};

const normalizePaymentStatus = (raw: UnknownRecord, status: SwapStatus): SwapPaymentStatus => {
  const normalized = text(raw.paymentStatus)?.toUpperCase();
  if (normalized === 'NOT_REQUIRED' || normalized === 'PENDING' || normalized === 'PAID' || normalized === 'FAILED' || normalized === 'REFUNDED') {
    return normalized;
  }
  const invoice = record(raw.invoice);
  const payments = Array.isArray(raw.payments) ? raw.payments.map(record) : [];
  const values = [invoice.status, ...payments.map((payment) => payment.status)]
    .map((value) => text(value)?.toUpperCase());
  if (values.includes('REFUNDED')) return 'REFUNDED';
  if (values.includes('PAID') || values.includes('SUCCESS')) return 'PAID';
  if (values.includes('PENDING') || values.includes('PROCESSING') || text(invoice.id)) return 'PENDING';
  if (values.includes('FAILED')) return 'FAILED';
  return status === 'FAILED' || status === 'CANCELLED' ? 'NOT_REQUIRED' : 'PENDING';
};

const transactionCode = (raw: UnknownRecord): string => {
  const explicit = text(raw.code);
  if (explicit) return explicit;
  const date = new Date(text(raw.startedAt, raw.createdAt) ?? Date.now());
  const datePart = Number.isNaN(date.getTime())
    ? '00000000'
    : `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const suffix = (text(raw.id) ?? '0000').replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase().padStart(4, '0');
  return `SWP-${datePart}-${suffix}`;
};

export const normalizeSwapHistoryItem = (value: unknown): SwapHistoryItem => {
  const raw = record(value);
  const station = record(raw.station);
  const vehicle = record(raw.vehicle);
  const vehicleSnapshot = record(raw.vehicleSnapshot);
  const invoice = record(raw.invoice);
  const payments = Array.isArray(raw.payments) ? raw.payments.map(record) : [];
  const latestPayment = payments[0] ?? {};
  const status = normalizeStatus(raw);
  const finalAmount = number(raw.finalAmount, invoice.amount, raw.cost) ?? 0;
  const startedAt = text(raw.startedAt, raw.createdAt) ?? new Date().toISOString();

  return {
    id: text(raw.id) ?? transactionCode(raw),
    code: transactionCode(raw),
    station: {
      id: text(station.id, raw.stationId) ?? undefined,
      name: text(station.name, raw.stationName) ?? 'Trạm chưa xác định',
      shortAddress: text(station.shortAddress, station.address),
    },
    vehicle: {
      id: text(vehicle.id, raw.vehicleId) ?? undefined,
      model: text(vehicle.model, vehicle.name, vehicleSnapshot.model, vehicleSnapshot.name) ?? 'Xe chưa xác định',
      licensePlate: text(vehicle.plateNumber, vehicle.licensePlate, vehicleSnapshot.plateNumber) ?? 'Chưa ghi nhận biển số',
    },
    staffName: text(raw.staffName, record(vehicleSnapshot.staff).fullName),
    oldBattery: battery(raw.oldBattery ?? raw.batteryIn, raw.batteryInSnapshot, raw.batteryInSoc),
    replacementBattery: battery(raw.replacementBattery ?? raw.batteryOut, raw.batteryOutSnapshot, raw.batteryOutSoc, text(raw.completedAt)),
    amount: number(raw.amount, raw.cost, invoice.amount) ?? 0,
    discountAmount: number(raw.discountAmount) ?? 0,
    finalAmount,
    status,
    paymentStatus: normalizePaymentStatus(raw, status),
    paymentMethod: text(invoice.paymentMethod, latestPayment.paymentMethod),
    paymentCode: text(latestPayment.vnpTxnRef, latestPayment.code, latestPayment.id),
    invoiceId: text(invoice.id, raw.invoiceId),
    failureReason: text(raw.failureReason),
    failedStep: text(raw.failedStep, raw.workflowStatus),
    failedAt: text(raw.failedAt, status === 'FAILED' ? raw.updatedAt : null),
    cancellationReason: text(raw.cancellationReason),
    startedAt,
    completedAt: text(raw.completedAt),
  };
};

export const swapHistoryService = {
  list: async (): Promise<SwapHistoryItem[]> => {
    const payload = await unwrapData<unknown>(await apiClient.get(API_ENDPOINTS.SWAP.HISTORY));
    const items = Array.isArray(payload) ? payload : record(record(payload).data).items ?? record(payload).items;
    return (Array.isArray(items) ? items : []).map(normalizeSwapHistoryItem);
  },
};
