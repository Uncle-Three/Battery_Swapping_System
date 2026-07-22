import type {
  BatteryInspectionEmailData,
  BookingEmailData,
<<<<<<< HEAD
  EmailVerificationData,
  EmailMessage,
  MaintenanceEmailData,
  PaymentEmailData,
=======
  EmailMessage,
  MaintenanceEmailData,
>>>>>>> c1e66c0b73c4c02a2d09fc6d7459f123759cc74f
  SwapCompletedEmailData,
  WarrantyEmailData,
  SwapSummaryReportEmailData,
} from "./email.types";

<<<<<<< HEAD
const escapeHtml = (value: unknown) => String(value ?? "-")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

=======
>>>>>>> c1e66c0b73c4c02a2d09fc6d7459f123759cc74f
const dateText = (value?: Date | string | null) =>
  value ? new Date(value).toLocaleString("vi-VN") : "Chua cap nhat";

const moneyText = (value: number) => `${value.toLocaleString("vi-VN")} VND`;

const shell = (title: string, rows: Array<[string, string | number | null | undefined]>) => {
  const body = rows
<<<<<<< HEAD
    .map(([label, value]) => `<tr><td style="padding:6px 12px;color:#475569">${escapeHtml(label)}</td><td style="padding:6px 12px;font-weight:600">${escapeHtml(value)}</td></tr>`)
=======
    .map(([label, value]) => `<tr><td style="padding:6px 12px;color:#475569">${label}</td><td style="padding:6px 12px;font-weight:600">${value ?? "-"}</td></tr>`)
>>>>>>> c1e66c0b73c4c02a2d09fc6d7459f123759cc74f
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
<<<<<<< HEAD
  verifyEmail: (data: EmailVerificationData): EmailMessage => {
    const subject = "Xác minh email BatterySwap";
    const html = `
      <div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.6;max-width:600px;margin:auto">
        <h1 style="color:#15803d;font-size:24px">Xác minh địa chỉ email</h1>
        <p>Xin chào <strong>${escapeHtml(data.customerName)}</strong>,</p>
        <p>Bấm nút bên dưới để xác minh và kích hoạt tài khoản BatterySwap. Liên kết có hiệu lực trong ${data.expiresMinutes} phút và chỉ dùng được một lần.</p>
        <p style="margin:28px 0;text-align:center">
          <a href="${escapeHtml(data.verificationUrl)}" style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;padding:13px 24px;border-radius:8px;font-weight:700">Xác minh email</a>
        </p>
      </div>`;
    const text = `Xin chào ${data.customerName}. Mở liên kết sau để xác minh email BatterySwap: ${data.verificationUrl}. Liên kết hết hạn sau ${data.expiresMinutes} phút.`;
    return { to: data.customerEmail, subject, text, html };
  },

  emailVerified: (data: Pick<EmailVerificationData, "customerName" | "customerEmail">): EmailMessage => {
    const subject = "Tài khoản BatterySwap đã được kích hoạt";
    const rows: Array<[string, string]> = [["Khách hàng", data.customerName], ["Trạng thái", "Email đã xác minh"]];
    return { to: data.customerEmail, subject, text: textFromRows(subject, rows), html: shell(subject, rows) };
  },

  paymentRequested: (data: PaymentEmailData): EmailMessage => {
    const subject = "Yêu cầu thanh toán dịch vụ thay pin";
    const rows: Array<[string, string | number | null | undefined]> = [["Khách hàng", data.customerName], ["Số tiền", moneyText(data.amount)]];
    const action = data.paymentUrl
      ? `<p style="margin:24px 0"><a href="${escapeHtml(data.paymentUrl)}" style="background:#16a34a;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:700">Thanh toán ngay</a></p>`
      : "";
    return {
      to: data.customerEmail,
      subject,
      text: `${textFromRows(subject, rows)}${data.paymentUrl ? `\nThanh toán: ${data.paymentUrl}` : ""}`,
      html: `${shell(subject, rows)}${action}`,
    };
  },

  paymentFailed: (data: PaymentEmailData): EmailMessage => {
    const subject = "Thanh toán chưa thành công";
    const rows: Array<[string, string | number | null | undefined]> = [["Khách hàng", data.customerName], ["Số tiền", moneyText(data.amount)], ["Lý do", data.reason ?? "Giao dịch không thành công"]];
    return { to: data.customerEmail, subject, text: textFromRows(subject, rows), html: shell(subject, rows) };
  },

=======
>>>>>>> c1e66c0b73c4c02a2d09fc6d7459f123759cc74f
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

  warrantyIssued: (data: WarrantyEmailData): EmailMessage => {
    const subject = "Phieu Bao Hanh Pin - 1 Nam";
    const html = `
      <div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.6;max-width:600px;margin:0 auto">
        <div style="background:linear-gradient(135deg,#15803d 0%,#166534 100%);padding:32px 24px;text-align:center;border-radius:12px 12px 0 0">
          <div style="font-size:36px;margin-bottom:8px">🔋</div>
          <h1 style="margin:0;color:#fff;font-size:22px;letter-spacing:1px">PHIEU BAO HANH PIN</h1>
          <p style="margin:6px 0 0;color:#bbf7d0;font-size:13px">Battery Swapping System</p>
        </div>

        <div style="background:#f0fdf4;border:2px dashed #22c55e;border-radius:8px;margin:20px 16px;padding:16px;text-align:center">
          <p style="margin:0 0 4px;color:#16a34a;font-size:12px;text-transform:uppercase;letter-spacing:2px">Ma Bao Hanh</p>
          <p style="margin:0;font-size:26px;font-weight:900;color:#15803d;letter-spacing:3px">${data.warrantyNumber}</p>
        </div>

        <div style="background:#fff;border:1px solid #e2e8f0;margin:0 16px;border-radius:8px;overflow:hidden">
          <table style="width:100%;border-collapse:collapse">
            <tr style="background:#f8fafc">
              <td style="padding:10px 16px;color:#64748b;font-size:13px;width:45%">Khach hang</td>
              <td style="padding:10px 16px;font-weight:600;font-size:13px">${data.customerName}</td>
            </tr>
            <tr>
              <td style="padding:10px 16px;color:#64748b;font-size:13px;border-top:1px solid #f1f5f9">Xe</td>
              <td style="padding:10px 16px;font-weight:600;font-size:13px;border-top:1px solid #f1f5f9">${data.vehicleName ?? "-"}</td>
            </tr>
            <tr style="background:#f8fafc">
              <td style="padding:10px 16px;color:#64748b;font-size:13px;border-top:1px solid #f1f5f9">Bien so</td>
              <td style="padding:10px 16px;font-weight:600;font-size:13px;border-top:1px solid #f1f5f9">${data.plateNumber ?? "-"}</td>
            </tr>
            <tr>
              <td style="padding:10px 16px;color:#64748b;font-size:13px;border-top:1px solid #f1f5f9">Pin bao hanh</td>
              <td style="padding:10px 16px;font-weight:600;font-size:13px;border-top:1px solid #f1f5f9">${data.newBatterySerial ?? "-"}</td>
            </tr>
            <tr style="background:#f8fafc">
              <td style="padding:10px 16px;color:#64748b;font-size:13px;border-top:1px solid #f1f5f9">Tram lap dat</td>
              <td style="padding:10px 16px;font-weight:600;font-size:13px;border-top:1px solid #f1f5f9">${data.stationName ?? "-"}</td>
            </tr>
            <tr>
              <td style="padding:10px 16px;color:#64748b;font-size:13px;border-top:1px solid #f1f5f9">Ngay cap</td>
              <td style="padding:10px 16px;font-weight:600;font-size:13px;border-top:1px solid #f1f5f9">${dateText(data.issuedAt)}</td>
            </tr>
            <tr style="background:#fef9c3">
              <td style="padding:10px 16px;color:#854d0e;font-size:13px;border-top:1px solid #fde68a;font-weight:700">Het han bao hanh</td>
              <td style="padding:10px 16px;font-weight:800;font-size:13px;color:#b45309;border-top:1px solid #fde68a">${dateText(data.expiresAt)}</td>
            </tr>
          </table>
        </div>

        <div style="margin:16px;padding:14px;background:#eff6ff;border-left:4px solid #3b82f6;border-radius:0 6px 6px 0">
          <p style="margin:0;font-size:12px;color:#1e40af">
            <strong>Dieu kien bao hanh:</strong> Bao hanh ap dung cho loi ky thuat san xuat trong vong 1 nam ke tu ngay cap.
            Khong ap dung trong truong hop hu hong do tai nan, su dung sai cach hoac tu y thay doi cau truc pin.
          </p>
        </div>

        <p style="text-align:center;color:#94a3b8;font-size:11px;padding:16px">Email duoc gui tu Battery Swapping System. Vui long giu email nay lam bang chung bao hanh.</p>
      </div>
    `;
    const text = textFromRows(subject, [
      ["Khach hang", data.customerName],
      ["Ma bao hanh", data.warrantyNumber],
      ["Pin bao hanh", data.newBatterySerial],
      ["Xe", data.vehicleName],
      ["Bien so", data.plateNumber],
      ["Tram", data.stationName],
      ["Ngay cap", dateText(data.issuedAt)],
      ["Het han", dateText(data.expiresAt)],
    ]);
    return { to: data.customerEmail, subject, text, html };
  },

  swapSummaryReport: (data: SwapSummaryReportEmailData): EmailMessage => {
    const subject = `Bao Cao Tong Hop Giao Dich Thay Pin #${data.swapId.slice(-6).toUpperCase()}`;
    const html = `
      <div style="font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;line-height:1.6;max-width:600px;margin:0 auto;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1)">
        <!-- Header -->
        <div style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);padding:32px 24px;text-align:center;color:#ffffff">
          <div style="font-size:40px;margin-bottom:8px">📄</div>
          <h1 style="margin:0;font-size:22px;font-weight:700;letter-spacing:0.5px">BÁO CÁO TỔNG HỢP DỊCH VỤ</h1>
          <p style="margin:6px 0 0;color:#94a3b8;font-size:14px">Mã giao dịch: #${data.swapId.toUpperCase()}</p>
        </div>

        <div style="padding:24px">
          <!-- Thông Tin Chung -->
          <h3 style="margin:0 0 12px;color:#0f172a;font-size:16px;border-bottom:2px solid #e2e8f0;padding-bottom:6px">👤 THÔNG TIN KHÁCH HÀNG</h3>
          <table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:14px">
            <tr>
              <td style="padding:6px 0;color:#64748b">Khách hàng:</td>
              <td style="padding:6px 0;font-weight:600;text-align:right">${data.customerName}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#64748b">Trạm thực hiện:</td>
              <td style="padding:6px 0;font-weight:600;text-align:right">${data.stationName}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#64748b">Phương tiện:</td>
              <td style="padding:6px 0;font-weight:600;text-align:right">${data.vehicleName ?? "-"}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#64748b">Biển kiểm soát:</td>
              <td style="padding:6px 0;font-weight:600;text-align:right">${data.plateNumber ?? "-"}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#64748b">Thời gian hoàn tất:</td>
              <td style="padding:6px 0;font-weight:600;text-align:right">${dateText(data.completedAt)}</td>
            </tr>
          </table>

          <!-- Thông Tin Thanh Toán -->
          <h3 style="margin:0 0 12px;color:#0f172a;font-size:16px;border-bottom:2px solid #e2e8f0;padding-bottom:6px">💰 THÔNG TIN THANH TOÁN</h3>
          <div style="background-color:#f8fafc;border-radius:12px;padding:16px;margin-bottom:20px;border:1px solid #e2e8f0">
            <table style="width:100%;border-collapse:collapse;font-size:14px">
              <tr>
                <td style="color:#64748b">Tổng chi phí dịch vụ:</td>
                <td style="font-size:18px;font-weight:700;color:#16a34a;text-align:right">${moneyText(data.amount)}</td>
              </tr>
              <tr>
                <td style="color:#64748b;padding-top:8px">Phương thức thanh toán:</td>
                <td style="font-weight:600;text-align:right;padding-top:8px">${data.paymentMethod}</td>
              </tr>
              <tr>
                <td style="color:#64748b;padding-top:8px">Trạng thái:</td>
                <td style="color:#15803d;font-weight:700;text-align:right;padding-top:8px">✓ ĐÃ THANH TOÁN</td>
              </tr>
            </table>
          </div>

          <!-- Kết Quả Kiểm Tra Pin Cũ -->
          <h3 style="margin:0 0 12px;color:#0f172a;font-size:16px;border-bottom:2px solid #e2e8f0;padding-bottom:6px">🔄 THU HỒI & KIỂM TRA PIN CŨ</h3>
          <table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:14px">
            <tr>
              <td style="padding:6px 0;color:#64748b">Mã số Serial Pin:</td>
              <td style="padding:6px 0;font-weight:600;text-align:right">${data.oldBatterySerial ?? "-"}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#64748b">Dung lượng thực tế (SOH):</td>
              <td style="padding:6px 0;font-weight:600;color:#ef4444;text-align:right">${data.oldBatterySoh !== undefined && data.oldBatterySoh !== null ? `${data.oldBatterySoh}%` : "-"}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#64748b">Mức sạc thu hồi (SOC):</td>
              <td style="padding:6px 0;font-weight:600;text-align:right">${data.oldBatterySoc !== undefined && data.oldBatterySoc !== null ? `${data.oldBatterySoc}%` : "-"}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#64748b">Tình trạng vật lý:</td>
              <td style="padding:6px 0;font-weight:600;text-align:right">${data.oldBatteryCondition ?? "-"}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#64748b">Kết luận kiểm định:</td>
              <td style="padding:6px 0;font-weight:700;color:#3b82f6;text-align:right">${data.oldBatteryOutcome ?? "-"}</td>
            </tr>
          </table>

          <!-- Bàn Giao Pin Mới & Bảo Hành -->
          <h3 style="margin:0 0 12px;color:#0f172a;font-size:16px;border-bottom:2px solid #e2e8f0;padding-bottom:6px">🔋 BÀN GIAO PIN MỚI & BẢO HÀNH</h3>
          <table style="width:100%;border-collapse:collapse;margin-bottom:12px;font-size:14px">
            <tr>
              <td style="padding:6px 0;color:#64748b">Mã số Serial Pin mới:</td>
              <td style="padding:6px 0;font-weight:600;text-align:right">${data.newBatterySerial ?? "-"}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#64748b">Mức sạc bàn giao (SOC):</td>
              <td style="padding:6px 0;font-weight:600;color:#16a34a;text-align:right">${data.newBatterySoc !== undefined && data.newBatterySoc !== null ? `${data.newBatterySoc}%` : "-"}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#64748b">Mã phiếu bảo hành:</td>
              <td style="padding:6px 0;font-weight:700;color:#15803d;text-align:right">${data.warrantyNumber ?? "-"}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#854d0e">Thời hạn bảo hành 1 năm:</td>
              <td style="padding:6px 0;font-weight:700;color:#b45309;text-align:right">${dateText(data.warrantyExpiresAt)}</td>
            </tr>
          </table>
        </div>

        <!-- Footer -->
        <div style="background-color:#f8fafc;padding:20px;text-align:center;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b">
          <p style="margin:0 0 4px 0;font-weight:600">Hệ Thống Đổi Pin Thông Minh - Battery Swapping System</p>
          <p style="margin:0">Cảm ơn quý khách đã tin tưởng và sử dụng dịch vụ của chúng tôi!</p>
        </div>
      </div>
    `;
    const text = textFromRows(subject, [
      ["Mã giao dịch", data.swapId],
      ["Khách hàng", data.customerName],
      ["Trạm", data.stationName],
      ["Tổng chi phí", moneyText(data.amount)],
      ["Phương thức", data.paymentMethod],
      ["Pin cũ", data.oldBatterySerial],
      ["Kết luận pin cũ", data.oldBatteryOutcome],
      ["Pin mới", data.newBatterySerial],
      ["Mã bảo hành", data.warrantyNumber],
      ["Hết hạn bảo hành", dateText(data.warrantyExpiresAt)],
    ]);
    return { to: data.customerEmail, subject, text, html };
  },
};
