import type {
  BatteryInspectionEmailData,
  BookingEmailData,
  EmailMessage,
  MaintenanceEmailData,
  SwapCompletedEmailData,
} from "./email.types";

const dateText = (value?: Date | string | null) =>
  value ? new Date(value).toLocaleString("vi-VN") : "Chua cap nhat";

const moneyText = (value: number) => `${value.toLocaleString("vi-VN")} VND`;

const shell = (title: string, rows: Array<[string, string | number | null | undefined]>) => {
  const body = rows
    .map(([label, value]) => `<tr><td style="padding:6px 12px;color:#475569">${label}</td><td style="padding:6px 12px;font-weight:600">${value ?? "-"}</td></tr>`)
    .join("");
  return `
    <div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.5">
      <h2 style="margin:0 0 12px;color:#15803d">${title}</h2>
      <table style="border-collapse:collapse;background:#f8fafc;border:1px solid #e2e8f0">${body}</table>
      <p style="margin-top:16px;color:#64748b">Email duoc gui tu Battery Swapping System.</p>
    </div>
  `;
};

const textFromRows = (title: string, rows: Array<[string, string | number | null | undefined]>) =>
  [title, ...rows.map(([label, value]) => `${label}: ${value ?? "-"}`), "Battery Swapping System"].join("\n");

export const emailTemplates = {
  bookingApproved: (data: BookingEmailData): EmailMessage => {
    const rows: Array<[string, string | number | null | undefined]> = [
      ["Khach hang", data.customerName],
      ["Tram", data.stationName],
      ["Xe", data.vehicleName],
      ["Bien so", data.plateNumber],
      ["Thoi gian", dateText(data.scheduledStart)],
    ];
    const subject = "Lich thay pin da duoc duyet";
    return { to: data.customerEmail, subject, text: textFromRows(subject, rows), html: shell(subject, rows) };
  },

  bookingRejected: (data: BookingEmailData): EmailMessage => {
    const rows: Array<[string, string | number | null | undefined]> = [
      ["Khach hang", data.customerName],
      ["Tram", data.stationName],
      ["Xe", data.vehicleName],
      ["Ly do", data.reason],
    ];
    const subject = "Lich thay pin bi tu choi";
    return { to: data.customerEmail, subject, text: textFromRows(subject, rows), html: shell(subject, rows) };
  },

  bookingRescheduled: (data: BookingEmailData): EmailMessage => {
    const rows: Array<[string, string | number | null | undefined]> = [
      ["Khach hang", data.customerName],
      ["Tram", data.stationName],
      ["Xe", data.vehicleName],
      ["Thoi gian de xuat", dateText(data.scheduledStart)],
      ["Ly do", data.reason],
    ];
    const subject = "Tram de xuat doi lich thay pin";
    return { to: data.customerEmail, subject, text: textFromRows(subject, rows), html: shell(subject, rows) };
  },

  batteryInspectionCompleted: (data: BatteryInspectionEmailData): EmailMessage => {
    const rows: Array<[string, string | number | null | undefined]> = [
      ["Khach hang", data.customerName],
      ["Ma pin", data.serialNumber],
      ["SOC", `${data.soc}%`],
      ["SOH", `${data.soh}%`],
      ["Nhiet do", data.temperature !== undefined ? `${data.temperature} C` : undefined],
      ["Dien ap", data.voltage !== undefined ? `${data.voltage} V` : undefined],
      ["Tinh trang vat ly", data.physicalCondition],
      ["Ket luan", data.outcome],
      ["Ghi chu", data.notes],
    ];
    const subject = "Kiem tra pin da hoan tat";
    return { to: data.customerEmail, subject, text: textFromRows(subject, rows), html: shell(subject, rows) };
  },

  maintenanceStatusChanged: (data: MaintenanceEmailData): EmailMessage => {
    const rows: Array<[string, string | number | null | undefined]> = [
      ["Khach hang", data.customerName],
      ["Ma pin", data.serialNumber],
      ["Trang thai", data.status],
      ["Ghi chu", data.notes],
    ];
    const subject = "Cap nhat trang thai bao tri pin";
    return { to: data.customerEmail, subject, text: textFromRows(subject, rows), html: shell(subject, rows) };
  },

  swapCompleted: (data: SwapCompletedEmailData): EmailMessage => {
    const rows: Array<[string, string | number | null | undefined]> = [
      ["Khach hang", data.customerName],
      ["Tram", data.stationName],
      ["Xe", data.vehicleName],
      ["Bien so", data.plateNumber],
      ["Pin cu", data.oldBatterySerial],
      ["Pin moi", data.newBatterySerial],
      ["So tien", moneyText(data.amount)],
      ["Hoan tat luc", dateText(data.completedAt)],
    ];
    const subject = "Giao dich thay pin hoan thanh";
    return { to: data.customerEmail, subject, text: textFromRows(subject, rows), html: shell(subject, rows) };
  },
};
