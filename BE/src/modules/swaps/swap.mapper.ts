type JsonRecord = Record<string, unknown>;

const asRecord = (value: unknown): JsonRecord =>
  value && typeof value === "object" ? value as JsonRecord : {};

const asText = (...values: unknown[]): string | null => {
  const value = values.find((entry) => typeof entry === "string" && entry.trim());
  return typeof value === "string" ? value : null;
};

const asNumber = (...values: unknown[]): number | null => {
  const value = values.find((entry) => typeof entry === "number" && Number.isFinite(entry));
  return typeof value === "number" ? value : null;
};

const asDateText = (...values: unknown[]): string | null => {
  for (const value of values) {
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
    if (typeof value === "string" && value.trim()) return value;
  }
  return null;
};

const statusOf = (swap: JsonRecord) => {
  const workflow = asText(swap.workflowStatus);
  if (asText(swap.status) === "FAILED" || workflow === "FAILED") return "FAILED";
  if (workflow === "ROLLED_BACK") return "CANCELLED";
  if (workflow === "COMPLETED") return "COMPLETED";
  if (!workflow || workflow === "NOT_STARTED") return "PENDING";
  return "IN_PROGRESS";
};

const paymentStatusOf = (swap: JsonRecord, status: string) => {
  const invoice = asRecord(swap.invoice);
  const payments = Array.isArray(swap.payments) ? swap.payments.map(asRecord) : [];
  const statuses = [invoice.status, ...payments.map((payment) => payment.status)].map(asText);
  if (statuses.includes("REFUNDED")) return "REFUNDED";
  if (statuses.includes("PAID") || statuses.includes("SUCCESS")) return "PAID";
  if (statuses.includes("PENDING") || statuses.includes("PROCESSING") || invoice.id) return "PENDING";
  if (statuses.includes("FAILED")) return "FAILED";
  return status === "FAILED" || status === "CANCELLED" ? "NOT_REQUIRED" : "PENDING";
};

const codeOf = (swap: JsonRecord) => {
  const explicit = asText(swap.code);
  if (explicit) return explicit;
  const createdAt = new Date(asDateText(swap.startedAt, swap.createdAt) ?? 0);
  const date = Number.isNaN(createdAt.getTime())
    ? "00000000"
    : `${createdAt.getFullYear()}${String(createdAt.getMonth() + 1).padStart(2, "0")}${String(createdAt.getDate()).padStart(2, "0")}`;
  const suffix = (asText(swap.id) ?? "0000").replace(/[^a-zA-Z0-9]/g, "").slice(-4).toUpperCase().padStart(4, "0");
  return `SWP-${date}-${suffix}`;
};

const batteryOf = (liveValue: unknown, snapshotValue: unknown, socValue: unknown) => {
  const live = asRecord(liveValue);
  const snapshot = asRecord(snapshotValue);
  const code = asText(snapshot.batteryCode, snapshot.code, live.batteryCode, live.code, snapshot.serialNumber, live.serialNumber);
  if (!code && !asText(snapshot.id, live.id)) return null;
  return {
    id: asText(snapshot.id, live.id),
    code: code ?? "Chưa ghi nhận",
    serialNumber: asText(snapshot.serialNumber, live.serialNumber),
    batteryType: asText(snapshot.type, snapshot.batteryType, live.type, live.batteryType),
    soc: asNumber(snapshot.soc, socValue, live.soc),
    soh: asNumber(snapshot.soh, live.soh),
  };
};

export const swapMapper = {
  toResponse: <T>(swap: T) => swap,
  toHistoryResponse: (value: unknown) => {
    const swap = asRecord(value);
    const station = asRecord(swap.station);
    const vehicle = asRecord(swap.vehicle);
    const vehicleSnapshot = asRecord(swap.vehicleSnapshot);
    const staff = asRecord(swap.staff);
    const invoice = asRecord(swap.invoice);
    const payments = Array.isArray(swap.payments) ? swap.payments.map(asRecord) : [];
    const latestPayment = payments[0] ?? {};
    const status = statusOf(swap);
    const amount = asNumber(invoice.amount, swap.cost) ?? 0;
    return {
      id: asText(swap.id),
      code: codeOf(swap),
      station: {
        id: asText(station.id, swap.stationId),
        name: asText(station.name) ?? "Trạm chưa xác định",
        shortAddress: asText(station.address),
      },
      vehicle: {
        id: asText(vehicle.id, swap.vehicleId),
        model: asText(vehicle.model, vehicle.name, vehicleSnapshot.model, vehicleSnapshot.name) ?? "Xe chưa xác định",
        licensePlate: asText(vehicle.plateNumber, vehicleSnapshot.plateNumber) ?? "Chưa ghi nhận biển số",
      },
      staffName: asText(staff.fullName, asRecord(vehicleSnapshot.staff).fullName),
      oldBattery: batteryOf(swap.batteryIn, swap.batteryInSnapshot, swap.batteryInSoc),
      replacementBattery: batteryOf(swap.batteryOut, swap.batteryOutSnapshot, swap.batteryOutSoc),
      amount,
      discountAmount: 0,
      finalAmount: amount,
      status,
      paymentStatus: paymentStatusOf(swap, status),
      paymentMethod: asText(invoice.paymentMethod, latestPayment.paymentMethod),
      paymentCode: asText(latestPayment.vnpTxnRef, latestPayment.id),
      invoiceId: asText(invoice.id),
      failureReason: asText(swap.failureReason),
      failedStep: status === "FAILED" ? asText(swap.workflowStatus) : null,
      failedAt: status === "FAILED" ? asDateText(swap.updatedAt) : null,
      startedAt: asDateText(swap.startedAt, swap.createdAt),
      completedAt: asDateText(swap.completedAt),
    };
  },
};
