# Database & Prisma Schema Summary

Tài liệu này mô tả chi tiết thiết kế database hiện tại của backend Battery Swapping System. Đây là phần nền quan trọng để code API, service, transaction logic và DTO/mapper khớp với frontend.

## 1. Tổng quan thiết kế

Database dùng PostgreSQL, được quản lý bằng Prisma ORM `6.19.3`.

File schema chính:

```text
BE/prisma/schema.prisma
```

Datasource:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Database được thiết kế theo các nhóm nghiệp vụ:

- Auth, user profile, RBAC.
- Vehicle management.
- Station, battery slot, battery inventory.
- Booking/reservation.
- Swap transaction và invoice.
- Wallet/payment/subscription.
- Technician maintenance và battery health monitoring.
- Admin system settings và audit logs.

Schema cố tình không thêm các field chỉ để khớp response FE như `stationName`, `userName`, `slotNumber` trực tiếp vào bảng transaction/booking. Những field này sẽ được lấy qua relation và map trong DTO/response mapper.

## 2. Enum

### `RoleName`

```prisma
GUEST
MEMBER
STAFF
TECHNICIAN
MANAGER
ADMIN
```

Khớp với FE role guard. Backend cần trả role string từ `User.role.name`.

### `UserStatus`

```prisma
ACTIVE
INACTIVE
BLOCKED
```

Dùng để khóa/mở tài khoản mà không cần xóa user.

### `VehicleStatus`

```prisma
ACTIVE
INACTIVE
```

Dùng để user quản lý nhiều xe và có thể vô hiệu hóa xe cũ.

### `StationStatus`

```prisma
ACTIVE
INACTIVE
MAINTENANCE
```

Dùng cho trạm đổi pin. FE hiện cần `ACTIVE`, `INACTIVE`, `MAINTENANCE`.

### `BatteryStatus`

```prisma
READY
CHARGING
MAINTENANCE
FAULTY
```

Ý nghĩa:

- `READY`: pin đủ điều kiện cấp cho khách.
- `CHARGING`: pin đang sạc.
- `MAINTENANCE`: pin đang bảo trì.
- `FAULTY`: pin lỗi nặng, không được cấp.

### `SlotStatus`

```prisma
EMPTY
CHARGING
READY
MAINTENANCE
```

Trạng thái khe/tủ pin tại trạm.

### `BookingStatus`

```prisma
PENDING
COMPLETED
CANCELLED
EXPIRED
```

Booking `PENDING` là booking đang giữ pin/slot. Các trạng thái còn lại là lịch sử và không được dùng để chặn booking mới.

### `TransactionStatus`

```prisma
SUCCESS
FAILED
```

Dùng cho swap transaction.

### `InvoiceStatus`

```prisma
PAID
UNPAID
```

Dùng cho hóa đơn phát sinh sau swap.

### `PaymentStatus`

```prisma
PENDING
SUCCESS
FAILED
```

Dùng cho giao dịch nạp ví hoặc thanh toán qua gateway.

### `PaymentMethod`

```prisma
MOMO
VNPAY
CARD
WALLET
CASH
```

Bao phủ mock payment hiện tại của FE và các phương thức thực tế về sau.

### `SubscriptionStatus`

```prisma
ACTIVE
EXPIRED
CANCELLED
```

Dùng cho gói thuê pin/tháng.

### `MaintenanceSeverity`

```prisma
LOW
WARNING
CRITICAL
```

Dùng cho cảnh báo BMS, health log và maintenance.

## 3. Auth, RBAC, Profile

### `Role`

Table map:

```prisma
@@map("roles")
```

Fields chính:

- `id`
- `name RoleName @unique`
- `users User[]`
- `createdAt`
- `updatedAt`

Mục đích:

- Quản lý RBAC.
- Một role có nhiều user.
- FE cần string role, backend mapper sẽ lấy `user.role.name`.

### `User`

Table map:

```prisma
@@map("users")
```

Fields chính:

- `id`
- `roleId`
- `fullName`
- `phone String? @unique`
- `email String @unique`
- `passwordHash`
- `rfidCard String? @unique`
- `licensePlate String? @unique`
- `avatarUrl String?`
- `status UserStatus`
- timestamps

Relations:

- `role Role`
- `wallet Wallet?`
- `vehicles Vehicle[]`
- `bookings Booking[]`
- `swapTransactions SwapTransaction[]`
- `subscriptions Subscription[]`
- `maintenanceRecords MaintenanceRecord[]`
- `auditLogs AuditLog[]`
- `payments PaymentTransaction[]`

Indexes:

- `roleId`
- `status`

Thiết kế quan trọng:

- Không đổi `fullName` thành `name`. API mapper sẽ map `fullName -> name`.
- `phone` sẽ map thành `phoneNumber` trong profile response.
- `avatarUrl` được thêm để đáp ứng FE `Profile.avatarUrl`.
- `licensePlate` được giữ như legacy field để tránh ảnh hưởng FE/code cũ. Nguồn dữ liệu chính về xe nên chuyển sang `Vehicle.plateNumber`.

DTO mapping dự kiến:

```text
User.fullName -> user.name
User.role.name -> user.role
User.phone -> profile.phoneNumber
User.avatarUrl -> profile.avatarUrl
```

## 4. Vehicle Management

### `Vehicle`

Table map:

```prisma
@@map("vehicles")
```

Fields:

- `id`
- `userId`
- `name`
- `plateNumber String @unique`
- `vinNumber String? @unique`
- `batteryType`
- `batteryCount Int @default(1)`
- `status VehicleStatus @default(ACTIVE)`
- timestamps

Relations:

- `user User`
- `bookings Booking[]`

Indexes:

- `userId`
- `status`

Mục đích:

- Một user có thể quản lý nhiều xe.
- Xác định xe thuộc user nào.
- Quản lý biển số, VIN.
- Xác định loại pin tương thích qua `batteryType`.
- Xác định xe dùng một pin hay nhiều pin qua `batteryCount`.

Compatibility logic sau này:

```text
Vehicle.batteryType so sánh với Battery.type
Vehicle.batteryCount dùng để tính số pin/costEstimate
```

Lưu ý:

- Chưa tạo model `BatteryType` riêng để giữ MVP đơn giản.
- `Battery.type` được giữ nguyên thay vì rename thành `batteryType` để tránh phá seed/code hiện tại.

## 5. Wallet, Payment, Subscription

### `Wallet`

Table map:

```prisma
@@map("wallets")
```

Fields:

- `id`
- `userId String @unique`
- `balance Int @default(0)`
- timestamps

Relations:

- `user User`

Mục đích:

- Mỗi user có tối đa một ví.
- Dùng để trừ tiền khi swap hoặc mua subscription.

### `PaymentTransaction`

Table map:

```prisma
@@map("payment_transactions")
```

Fields:

- `id`
- `userId`
- `amount`
- `paymentMethod PaymentMethod`
- `status PaymentStatus`
- `description`
- timestamps

Relations:

- `user User`

Indexes:

- `userId`
- `status`

Mục đích:

- Lưu lịch sử nạp ví/thanh toán.
- Ban đầu có thể mock gateway, sau này nối MoMo/VNPay/card thật.

### `SubscriptionPackage`

Table map:

```prisma
@@map("subscription_packages")
```

Fields:

- `id`
- `name`
- `price`
- `description`
- `monthlyLimit`
- `isUnlimited`
- `isActive`
- timestamps

Relations:

- `subscriptions Subscription[]`

Mục đích:

- Định nghĩa các gói như Eco/Unlimited.
- FE hiện đang mock package trong Payment page.

### `Subscription`

Table map:

```prisma
@@map("subscriptions")
```

Fields:

- `id`
- `userId`
- `packageId`
- `status SubscriptionStatus`
- `startedAt`
- `expiresAt`
- `usageCount`
- timestamps

Relations:

- `user User`
- `package SubscriptionPackage`

Indexes:

- `userId`
- `status`

Mục đích:

- Lưu gói user đã mua.
- Dùng trong swap service để quyết định trừ ví hay dùng lượt/gói.

## 6. Station, Slot, Battery

### `Station`

Table map:

```prisma
@@map("stations")
```

Fields:

- `id`
- `name`
- `address`
- `latitude`
- `longitude`
- `status StationStatus`
- timestamps

Relations:

- `slots BatterySlot[]`
- `bookings Booking[]`
- `swapTransactions SwapTransaction[]`

Indexes:

- `status`

Mục đích:

- Đại diện một trạm/tủ đổi pin.
- FE station list cần `name`, `address`, `latitude`, `longitude`, `status`, `slots`.

DTO mapping:

```text
Station.name -> stationName khi nằm trong booking/swap response
Station.address -> stationAddress khi cần
```

### `BatterySlot`

Table map:

```prisma
@@map("battery_slots")
```

Fields:

- `id`
- `stationId`
- `slotNumber`
- `status SlotStatus`
- timestamps

Relations:

- `station Station`
- `battery Battery?`
- `bookings Booking[]`

Constraints/indexes:

- `@@unique([stationId, slotNumber])`
- `stationId`
- `status`

Mục đích:

- Một trạm có nhiều slot.
- Mỗi slot tại một trạm có số thứ tự duy nhất.
- FE cần `slotNumber`, `status`, và battery hiện tại.

DTO mapping:

```text
BatterySlot.slotNumber -> Booking.slotNumber hoặc station slots response
```

### `Battery`

Table map:

```prisma
@@map("batteries")
```

Fields:

- `id`
- `serialNumber String @unique`
- `soc`
- `soh`
- `temperature`
- `voltage`
- `type String?`
- `status BatteryStatus`
- `slotId String? @unique`
- `lastUpdated`
- timestamps

Relations:

- `slot BatterySlot?`
- `bookings Booking[]`
- `batteryInTransactions SwapTransaction[]`
- `batteryOutTransactions SwapTransaction[]`
- `maintenanceRecords MaintenanceRecord[]`
- `healthLogs BatteryHealthLog[]`

Indexes:

- `status`
- `slotId`

Mục đích:

- Quản lý từng cục pin vật lý.
- `soc`, `soh`, `temperature`, `voltage` dùng cho FE inventory và technician.
- `type` dùng cho compatibility với `Vehicle.batteryType`.

Lưu ý:

- `slotId` là unique để một pin chỉ nằm ở một slot tại một thời điểm.
- Pin không ở slot nào thì `slotId = null`.
- `type` giữ nguyên tên để tránh migration rename/drop chưa cần thiết.

## 7. Battery Health & Technician

### `BatteryHealthLog`

Table map:

```prisma
@@map("battery_health_logs")
```

Fields:

- `id`
- `batteryId`
- `soc`
- `soh`
- `temperature`
- `voltage`
- `severity MaintenanceSeverity?`
- `errorCode String?`
- `errorLog String?`
- `recordedAt`

Relations:

- `battery Battery`

Indexes:

- `batteryId`
- `severity`
- `recordedAt`

Mục đích:

- Lưu lịch sử tình trạng pin từ BMS.
- Hỗ trợ Technician page cần:

```text
soc
soh
temperature
voltage
severity
errorLog
```

Phân biệt với `MaintenanceRecord`:

- `BatteryHealthLog.errorLog`: lỗi/cảnh báo từ BMS.
- `MaintenanceRecord.notes`: ghi chú xử lý của technician.

### `MaintenanceRecord`

Table map:

```prisma
@@map("maintenance_records")
```

Fields:

- `id`
- `batteryId`
- `technicianId String?`
- `soh`
- `soc`
- `status BatteryStatus`
- `severity MaintenanceSeverity?`
- `notes`
- timestamps

Relations:

- `battery Battery`
- `technician User?`

Indexes:

- `batteryId`
- `technicianId`

Mục đích:

- Lưu biên bản/phiếu xử lý bảo trì.
- Sau này endpoint `POST /maintenance-records` hoặc route tương ứng sẽ tạo record và có thể update trạng thái Battery.

## 8. Booking

### `Booking`

Table map:

```prisma
@@map("bookings")
```

Fields:

- `id`
- `userId`
- `vehicleId String?`
- `stationId`
- `slotId String?`
- `batteryId String?`
- `vehicleName String?`
- `timeSlot String?`
- `scheduledStart DateTime?`
- `scheduledEnd DateTime?`
- `costEstimate Int?`
- `status BookingStatus`
- `expiryTime`
- timestamps

Relations:

- `user User`
- `vehicle Vehicle?`
- `station Station`
- `slot BatterySlot?`
- `battery Battery?`
- `transaction SwapTransaction?`

Indexes:

- `userId`
- `vehicleId`
- `stationId`
- `status`
- `expiryTime`

Mục đích:

- User reserve pin/slot tại station.
- `vehicleId` liên kết xe thật của user.
- `vehicleName` giữ làm snapshot/tương thích FE hiện tại.
- `timeSlot` giữ để tương thích FE hiện tại.
- `scheduledStart/scheduledEnd` dùng cho logic lịch chính xác hơn.
- `expiryTime` dùng booking expiry job.

Quan trọng:

- Không thêm unique đơn giản trên `batteryId` hoặc `slotId`.
- Booking cũ `COMPLETED`, `CANCELLED`, `EXPIRED` vẫn cần lưu lịch sử.
- Chống double booking sẽ xử lý trong Booking Service bằng Prisma transaction.

Booking transaction service sau này nên:

1. Chọn station `ACTIVE`.
2. Chọn battery `READY` và compatible với vehicle.
3. Kiểm tra không có booking `PENDING` chưa hết hạn cho battery/slot đó.
4. Tạo booking và reserve battery/slot trong cùng transaction.
5. Khi booking expired/cancelled thì release battery/slot.

## 9. Swap Transaction & Invoice

### `SwapTransaction`

Table map:

```prisma
@@map("swap_transactions")
```

Fields:

- `id`
- `userId`
- `stationId`
- `bookingId String? @unique`
- `batteryInId String?`
- `batteryInSoc Int`
- `batteryOutId String?`
- `batteryOutSoc Int`
- `cost Int`
- `status TransactionStatus`
- timestamps

Relations:

- `user User`
- `station Station`
- `booking Booking?`
- `batteryIn Battery?`
- `batteryOut Battery?`
- `invoice Invoice?`

Indexes:

- `userId`
- `stationId`
- `status`

Mục đích:

- Ghi nhận giao dịch đổi pin.
- `batteryInId` và `batteryOutId` nullable để cho phép tạo transaction ở bước initiate trước khi hoàn tất.
- API history sau này chỉ nên trả transaction hoàn tất có đủ pin vào/pin ra.

DTO mapping:

```text
SwapTransaction.user.fullName -> userName
SwapTransaction.station.name -> stationName
```

### `Invoice`

Table map:

```prisma
@@map("invoices")
```

Fields:

- `id`
- `transactionId String @unique`
- `amount`
- `paymentMethod PaymentMethod`
- `status InvoiceStatus`
- timestamps

Relations:

- `transaction SwapTransaction`

Mục đích:

- Một swap transaction có tối đa một invoice.
- FE History modal có thể map từ transaction + invoice.

## 10. Admin & System

### `SystemSetting`

Table map:

```prisma
@@map("system_settings")
```

Fields:

- `id`
- `key String @unique`
- `value`
- `description`
- timestamps

Mục đích:

- Lưu tham số nghiệp vụ như:
  - `STANDARD_SWAP_PRICE`
  - `BOOKING_EXPIRY_MINUTES`

### `AuditLog`

Table map:

```prisma
@@map("audit_logs")
```

Fields:

- `id`
- `adminId String?`
- `action`
- `details`
- `createdAt`

Relations:

- `admin User?`

Indexes:

- `adminId`

Mục đích:

- Lưu thao tác admin quan trọng.
- Không lưu `adminName` trực tiếp. API mapper lấy:

```text
AuditLog.admin.fullName -> adminName
AuditLog.createdAt -> time
```

## 11. Quan hệ tổng quan

```text
Role 1 - n User
User 1 - 1 Wallet
User 1 - n Vehicle
User 1 - n Booking
User 1 - n SwapTransaction
User 1 - n PaymentTransaction
User 1 - n Subscription
User 1 - n MaintenanceRecord as technician
User 1 - n AuditLog as admin

Station 1 - n BatterySlot
Station 1 - n Booking
Station 1 - n SwapTransaction

BatterySlot 1 - 0/1 Battery
BatterySlot 1 - n Booking

Battery 1 - n Booking
Battery 1 - n BatteryHealthLog
Battery 1 - n MaintenanceRecord
Battery 1 - n SwapTransaction as batteryIn
Battery 1 - n SwapTransaction as batteryOut

Vehicle 1 - n Booking
Booking 0/1 - 1 SwapTransaction
SwapTransaction 1 - 0/1 Invoice
SubscriptionPackage 1 - n Subscription
```

## 12. Mapping DB sang FE DTO

Không sửa schema chỉ để khớp FE response. Dùng mapper:

```text
User.fullName -> name
User.role.name -> role
User.phone -> phoneNumber
User.avatarUrl -> avatarUrl

Station.name -> stationName khi nằm trong booking/swap
Station.address -> stationAddress

BatterySlot.slotNumber -> slotNumber

Booking.station.name -> stationName
Booking.station.address -> stationAddress
Booking.slot.slotNumber -> slotNumber

SwapTransaction.user.fullName -> userName
SwapTransaction.station.name -> stationName

AuditLog.admin.fullName -> adminName
AuditLog.createdAt -> time
```

FE hiện dùng camelCase, nên response mapper cũng nên trả camelCase.

## 13. Seed data hiện tại

File:

```text
BE/prisma/seed.ts
```

Seed tạo:

- Roles đầy đủ.
- Users demo:
  - `admin@batteryswap.local`
  - `member@batteryswap.local`
  - `staff@batteryswap.local`
  - `technician@batteryswap.local`
  - `manager@batteryswap.local`
- Password chung:

```text
123456
```

- Wallet cho member.
- 2 vehicles cho member:
  - VinFast Feliz S, `batteryType = LFP 72V`, `batteryCount = 1`
  - VinFast Klara S, `batteryType = Lithium 72V`, `batteryCount = 2`
- 2 stations:
  - GreenCharge Quan 1
  - GreenCharge Quan 7
- Battery slots theo từng station.
- Batteries:
  - B001, B002, B003, B004, B005
- Battery health logs:
  - LOW/normal
  - WARNING
  - CRITICAL
- Subscription packages:
  - Eco
  - Unlimited
- System settings:
  - `STANDARD_SWAP_PRICE = 45000`
  - `BOOKING_EXPIRY_MINUTES = 30`
- Audit log seed.

## 14. Migration hiện tại

Migrations:

```text
prisma/migrations/20260711000000_init_core/migration.sql
prisma/migrations/20260711010000_add_vehicle_and_battery_health_logs/migration.sql
```

Migration `add_vehicle_and_battery_health_logs` thêm:

- enum `VehicleStatus`
- table `vehicles`
- table `battery_health_logs`
- `users.avatarUrl`
- `bookings.vehicleId`
- `bookings.scheduledStart`
- `bookings.scheduledEnd`
- index/FK tương ứng

Lưu ý:

- Database local từng báo drift vì lịch sử migration trong DB không khớp folder migrations hiện tại.
- Không tự reset DB nếu đang có dữ liệu cần giữ.
- Với dev DB có thể reset khi cần:

```bash
npx prisma migrate reset
```

## 15. Những phần không xử lý bằng schema

Các logic sau không nên giải quyết bằng constraint đơn giản trong DB ở giai đoạn này:

### Chống double booking

Không dùng unique trên `Booking.batteryId` hoặc `Booking.slotId`, vì booking cũ vẫn cần lưu.

Xử lý trong service transaction:

- Chỉ chọn battery `READY`.
- Không có booking `PENDING` chưa hết hạn.
- Tạo booking và reserve trong cùng Prisma transaction.
- Hủy/expire thì release.

### Compatibility check

Xử lý trong service:

```text
Vehicle.batteryType == Battery.type
Vehicle.batteryCount dùng để tính số pin hoặc cost
```

### Booking expiry job

Xử lý trong scheduler:

- Tìm booking `PENDING` đã quá `expiryTime`.
- Chuyển `EXPIRED`.
- Release battery/slot nếu đã reserve.

### DTO/response mapper

Không thêm field dư vào DB. Mapper chịu trách nhiệm shape response cho FE.

## 16. Lệnh kiểm tra schema

```bash
npx prisma format
npm run prisma:generate
npm run typecheck
npm run build
```

Nếu cần apply migration vào dev DB:

```bash
npm run prisma:migrate
npm run prisma:seed
```

