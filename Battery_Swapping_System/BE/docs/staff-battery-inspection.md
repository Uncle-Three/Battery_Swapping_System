# Staff Battery Inspection And Swap Flow

Tai lieu nay giai thich phan code moi cho task:

- Staff kiem tra pin.
- Staff quet ma pin truoc de lay thong tin pin.
- He thong goi y suc khoe pin theo quang duong va thoi gian su dung.
- Staff co the tu chinh SOH khi lap bien ban kiem tra.
- Khi lap pin thanh cong, BE cap nhat pin moi vao xe va lich su gan pin.
- FE goi API moi trong man `ProcessSwap`.

## 1. Tong quan workflow thay pin

Workflow staff dang nam trong module:

- `BE/src/modules/staff-swaps/staff-swap.route.ts`
- `BE/src/modules/staff-swaps/staff-swap.controller.ts`
- `BE/src/modules/staff-swaps/staff-swap.service.ts`
- `FE/Battery_Swapping_System/src/features/dashboard/pages/staff/ProcessSwap.tsx`
- `FE/Battery_Swapping_System/src/services/swapService.ts`

Trang thai chinh cua mot lan thay pin:

1. `NOT_STARTED`: Da check-in booking, chua xac minh.
2. `VERIFIED`: Da xac minh khach, xe va pin dang lap tren xe.
3. `OLD_BATTERY_REMOVED`: Da thao pin cu.
4. `OLD_BATTERY_INSPECTED`: Da kiem tra pin cu.
5. `REPLACEMENT_ASSIGNED`: Da gan pin thay the da duoc dat truoc.
6. `INSTALLED`: Da lap pin moi vao xe.
7. `PAYMENT_PENDING`: Da gui yeu cau thanh toan VNPay.
8. `COMPLETED`: Thanh toan thanh cong, giao dich hoan tat.

## 2. API moi: quet ma pin lay thong tin

Da them endpoint:

```http
POST /staff/swaps/:id/scan-battery
```

Body:

```json
{
  "serialNumber": "BAT-001"
}
```

Validation nam trong:

```ts
export const scanBatterySchema = z.object({
  serialNumber: z.string().trim().min(3).max(100)
}).strict();
```

API nay chap nhan ma staff quet/nhap theo 3 kieu:

- `serialNumber`
- `batteryCode`
- `qrCodeValue`

Service se tra ve:

- Thong tin pin trong database: SOC, SOH, nhiet do, dien ap, trang thai van hanh, safety state.
- Uoc tinh SOH theo quang duong va tuoi pin.
- Bien `expectedForCurrentStep` de FE biet pin vua quet co dung voi buoc hien tai hay khong.

Vi du response rut gon:

```json
{
  "battery": {
    "serialNumber": "BAT-001",
    "soc": 78,
    "soh": 91,
    "operationalStatus": "REMOVED",
    "safetyState": "SAFE"
  },
  "estimate": {
    "estimatedSoh": 90.4,
    "accumulatedMileageKm": 48000,
    "ageYears": 1.2,
    "healthClassification": "HEALTHY"
  },
  "expectedForCurrentStep": true
}
```

## 3. Cach BE uoc tinh suc khoe pin

Ham moi trong `staff-swap.service.ts`:

```ts
const estimateHealth = (battery) => { ... }
```

Logic:

- Lay `accumulatedMileageKm` neu pin da co du lieu km.
- Neu chua co km, suy ra km tu SOH hien tai bang ham co san `inferAccumulatedMileageKm`.
- Tinh SOH theo km bang `calculateBatterySoh`.
- Tinh them do hao mon theo tuoi pin:
  - Lay `activatedDate`, neu khong co thi lay `manufacturedDate`.
  - Moi nam tru 2% SOH.
- Lay gia tri nho hon giua SOH theo km va SOH theo tuoi.
- Phan loai bang `classifyBatterySoh`.

Day la "goi y" cho staff, khong ep cung. FE tu dien vao form, staff van co the sua lai SOH.

## 4. Sua inspect: staff duoc set SOH tuy y

Truoc do ham `inspect` nhan `soh` tu FE nhung lai tinh lai SOH bang cong thuc, nen staff nhap gia tri nao cung bi ghi de.

Da sua thanh:

- Lay `input.soh` cua staff.
- Lam tron 2 chu so.
- Luu vao `Battery.soh` va `Battery.estimatedSoH`.
- Set `healthSource = MANUAL_INSPECTION`.
- Cap nhat `lastHealthCheckAt`, `lastEstimatedAt`, `lastUpdated`.
- Tao `BatteryInspection` voi ket qua kiem tra.

Y nghia:

- Neu staff dung may do/AI/noi suy bang kinh nghiem, staff co the nhap SOH thuc te.
- He thong van co goi y ban dau tu API scan.

## 5. Sua install: lap pin thanh cong phai cap nhat du lieu xe

Truoc do endpoint:

```http
POST /staff/swaps/:id/install
```

chi chuyen `workflowStatus` sang `INSTALLED`.

Da sua de khi staff xac nhan lap pin:

- Huy active assignment cu con sot lai cua xe.
- Tao `VehicleBatteryAssignment` moi cho pin thay the.
- Cap nhat `Vehicle.currentBatteryId` bang pin moi.
- Cap nhat pin moi:
  - `operationalStatus = INSTALLED`
  - `currentVehicleId = vehicleId`
  - `slotId = null`
  - `stationId = null`
- Consume `BatteryReservation` cua booking.
- Dong lich su pin cu trong `VehicleBatteryHistory`.
- Tao lich su pin moi trong `VehicleBatteryHistory`.
- Tao `BatteryLifecycleEvent` loai `INSTALLED_TO_VEHICLE`.
- Sau do moi chuyen workflow sang `INSTALLED`.

Nhu vay, "lap pin thanh cong" khong chi la doi trang thai man hinh, ma database da biet xe dang dung pin moi.

## 6. Sua finalize thanh toan VNPay de khong tao trung assignment

File:

```ts
BE/src/modules/payments/payment.repository.ts
```

Truoc do khi thanh toan VNPay thanh cong, code luon tao them `VehicleBatteryAssignment`.

Vi bay gio assignment da duoc tao o buoc `install`, finalize thanh toan da duoc sua:

- Kiem tra da co active assignment cho pin moi chua.
- Neu chua co thi moi tao bu.
- Neu co roi thi khong tao trung.
- Van cap nhat booking sang `COMPLETED`, invoice sang `PAID`, swap sang `COMPLETED`.

## 7. FE da goi API scan nhu the nao

File:

```ts
FE/Battery_Swapping_System/src/services/swapService.ts
```

Da them type:

```ts
export type ScannedBatteryInfo = { ... };
```

Va ham:

```ts
scanBattery: async (id: string, serialNumber: string) =>
  unwrapData<ScannedBatteryInfo>(
    await apiClient.post(API_ENDPOINTS.SWAP.SCAN_BATTERY(id), { serialNumber })
  )
```

Endpoint FE nam trong:

```ts
SCAN_BATTERY: (id: string) => `/staff/swaps/${id}/scan-battery`
```

Trong man:

```ts
FE/Battery_Swapping_System/src/features/dashboard/pages/staff/ProcessSwap.tsx
```

Da them:

- Nut `Lay info pin`.
- State `scanInfo`.
- Goi `swapService.scanBattery`.
- Tu dien:
  - `soc`
  - `inspection.soh`
  - `inspection.temperature`
  - `inspection.voltage`
- Hien thi canh bao neu pin vua quet khong dung voi buoc hien tai.

## 8. Luong staff su dung tren FE

1. Staff mo man quy trinh thay pin.
2. Bam xac minh khach, xe va pin.
3. Quet ma pin cu, bam `Lay info pin`.
4. FE hien thong tin pin va goi y SOH.
5. Staff xac nhan thao pin cu.
6. Staff kiem tra pin cu:
   - Dung gia tri goi y.
   - Hoac sua SOH/SOC/nhiet do/dien ap/ket luan.
7. Staff luu bien ban kiem tra.
8. Staff quet pin thay the, bam `Lay info pin`.
9. Staff gan pin thay the da giu.
10. Staff quet lai pin moi sau khi lap, xac nhan lap pin thanh cong.
11. BE cap nhat pin moi vao xe.
12. Staff gui yeu cau thanh toan VNPay.
13. Khi VNPay callback thanh cong, swap thanh `COMPLETED`.

## 9. Cac file da thay doi

- `BE/src/modules/staff-swaps/staff-swap.validation.ts`
- `BE/src/modules/staff-swaps/staff-swap.route.ts`
- `BE/src/modules/staff-swaps/staff-swap.controller.ts`
- `BE/src/modules/staff-swaps/staff-swap.service.ts`
- `BE/src/modules/payments/payment.repository.ts`
- `FE/Battery_Swapping_System/src/constants/endpoints.ts`
- `FE/Battery_Swapping_System/src/services/swapService.ts`
- `FE/Battery_Swapping_System/src/features/dashboard/pages/staff/ProcessSwap.tsx`

