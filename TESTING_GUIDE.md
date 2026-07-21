# 🚀 Hướng Dẫn Kiểm Thử Hệ Thống (Test Flow Guide)

Tài liệu này hướng dẫn chi tiết quy trình kiểm thử toàn bộ các luồng công việc (End-to-End Flows) trong hệ thống **Battery Swapping System** (Hệ thống quản lý và thay pin xe điện).

---

## 🛠️ 1. Môi Trường & Tài Khoản Mẫu

### 🌐 Địa chỉ dịch vụ
- **Frontend App**: `http://localhost:5173`
- **Backend API**: `http://localhost:5000/api/v1`
- **Swagger API Docs**: `http://localhost:5000/api-docs`

> [!IMPORTANT]
> Tất cả các tài khoản demo dưới đây đều dùng chung mật khẩu: **`123456`**

### 🔑 Danh sách tài khoản thử nghiệm theo vai trò

| Vai trò (Role) | Email Đăng Nhập | Mật Khẩu | Mục đích sử dụng |
| :--- | :--- | :--- | :--- |
| **Khách hàng (Member)** | `member@batteryswap.local` | `123456` | Đặt lịch thay pin, quản lý xe điện, xem lịch sử |
| **Nhân viên trạm (Staff)** | `staff@batteryswap.local` | `123456` | Check-in khách hàng, thực hiện quy trình tháo/lắp pin |
| **Kỹ thuật viên (Technician)** | `technician@batteryswap.local` | `123456` | Kiểm tra sức khỏe pin (SoH), lập phiếu bảo trì |
| **Quản lý trạm (Manager)** | `manager@batteryswap.local` | `123456` | Duyệt lịch đặt, quản lý kho pin, quản lý khoang & lịch trạm |
| **Quản trị viên (Admin)** | `admin@batteryswap.local` | `123456` | Quản lý người dùng, phân công nhân sự, cấu hình trạm |

---

## 🔄 2. Các Luồng Kiểm Thử Chi Tiết (Test Flows)

### 🔴 LUỒNG 1: Đặt Lịch & Thay Pin Hoàn Chỉnh (End-to-End Core Flow)

#### 📍 Bước 1: Khách hàng đặt lịch thay pin (Role: Member)
1. Đăng nhập tài khoản `member@batteryswap.local` / `123456` tại `http://localhost:5173/login`.
2. Vào mục **Đặt lịch mới** (`/app/bookings/new`).
3. Chọn xe điện (Ví dụ: `VinFast VF 8 Eco - 51K-12345`).
4. Chọn Trạm thay pin (Ví dụ: `GreenCharge Quận 1`) và chọn khung giờ muốn thay pin.
5. Nhấn **Xác nhận đặt lịch**.
6. Kiểm tra lịch vừa tạo xuất hiện ở trạng thái **Đang chờ duyệt** (`PENDING_APPROVAL`) trong danh sách **Lịch thay pin của tôi** (`/app/bookings`).

#### 📍 Bước 2: Quản lý trạm duyệt lịch đặt (Role: Manager)
1. Mở cửa sổ ẩn danh (hoặc Đăng xuất) và Đăng nhập tài khoản `manager@batteryswap.local` / `123456`.
2. Vào mục **Phê duyệt lịch đặt** (`/manager/approvals`).
3. Tìm yêu cầu đặt lịch vừa tạo của khách hàng `Nguyen Tuan Anh`.
4. Bấm **Chấp nhận / Duyệt lịch**. Trạng thái chuyển thành **Đã duyệt** (`APPROVED`).

#### 📍 Bước 3: Nhân viên trạm đón khách & thay pin (Role: Staff)
1. Đăng nhập tài khoản `staff@batteryswap.local` / `123456`.
2. Vào mục **Chọn khoang có khách** (`/staff/check-in`).
3. Bạn sẽ thấy khoang dịch vụ có khách chờ. Bấm **Chọn khoang này** $\rightarrow$ Bấm **Xác minh khách đã đến trạm & Bắt đầu thay pin**.
4. Giao diện chuyển sang quy trình thay pin từng bước (`/staff/swaps/:id`):
   - **Bước 1**: Kiểm tra thông tin xe & khách hàng.
   - **Bước 2**: Tháo pin cũ từ xe và quét mã/xác nhận pin tháo.
   - **Bước 3**: Lấy pin mới từ khoang sạc và lắp vào xe.
   - **Bước 4**: Kiểm tra hoàn tất và bấm **Hoàn thành giao dịch thay pin**.

---

### 🟡 LUỒNG 2: Kiểm Tra & Bảo Trì Pin (Technician Flow)

1. Đăng nhập tài khoản `technician@batteryswap.local` / `123456`.
2. Vào mục **Kiểm tra pin** (`/staff/inspections`):
   - Chọn pin cần đánh giá.
   - Nhập chỉ số sức khỏe pin (SoH %), nhiệt độ (°C) và điện áp (V).
   - Đánh giá mức độ an toàn (`SAFE` / `WARNING` / `UNSAFE`).
3. Vào mục **Yêu cầu bảo trì** (`/staff/maintenance`):
   - Tạo phiếu bảo trì cho pin bị lỗi hoặc cần sạc lại.
   - Cập nhật trạng thái phiếu bảo trì từ `OPEN` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `RESOLVED`.

---

### 🟢 LUỒNG 3: Quản Lý Kho Pin & Khoang Dịch Vụ (Manager / Admin Flow)

1. Đăng nhập tài khoản `admin@batteryswap.local` hoặc `manager@batteryswap.local`.
2. Vào mục **Quản lý trạm** (`/admin/stations`):
   - Chọn trạm `GreenCharge Quận 1`.
3. Tab **Khoang & Lịch** (`bays-slots`):
   - Bấm **"+ Tạo khoang"** để thêm khoang phục vụ mới (Ví dụ: `BAY-02`).
   - Bấm **"+ Tạo lịch"** để thêm các khung giờ phục vụ cho khoang.
4. Tab **Kho pin thay thế** (`inventory`):
   - Bấm **"+ Thêm pin"** để thêm pin mới vào kho của trạm (Ví dụ mã pin: `BAT-001`).
   - Thực hiện chuyển pin sang trạm khác hoặc gửi pin đi bảo trì.

---

### 🔵 LUỒNG 4: Quản Lý Người Dùng & Phân Công Nhân Sự (Admin Flow)

1. Đăng nhập tài khoản `admin@batteryswap.local` / `123456`.
2. Vào mục **Quản lý người dùng** (`/admin/users`):
   - Xem danh sách toàn bộ người dùng trong hệ thống.
   - Khóa/Mở khóa hoặc đổi vai trò của người dùng.
3. Vào mục **Phân công trạm** (`/admin/station-assignments`):
   - Phân công Staff/Technician/Manager vào trạm làm việc và xếp ca (Ca sáng, Ca chiều, Ca tối).

---

## ⚡ 3. Các Lệnh Hỗ Trợ Độc Lập (Utility Commands)

Trong quá trình kiểm thử, nếu bạn muốn reset lại toàn bộ dữ liệu mẫu sạch sẽ:

```powershell
# Chạy script seed dữ liệu mẫu mới
cd BE
npm run db:seed
```

Nếu muốn xóa toàn bộ database và tạo lại từ đầu:
```powershell
cd BE
$env:ALLOW_DATABASE_RESET="true"
npm run db:reset
npm run db:seed
```

---

> [!TIP]
> Nếu gặp bất kỳ lỗi kết nối MongoDB nào, hãy đảm bảo service MongoDB local đã khởi chạy Replica Set `rs0` bằng câu lệnh:
> `npx tsx scripts/init-replica.ts` trong thư mục `BE`.
