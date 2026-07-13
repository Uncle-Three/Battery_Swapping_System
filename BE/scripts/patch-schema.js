const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

if (!schema.includes('enum BatteryOwnershipType')) {
  schema = schema.replace(/enum MaintenanceSeverity \{[\s\S]*?\}/, `$&

enum BatteryOwnershipType {
  OWNED
  SUBSCRIPTION
  LEASED
  UNKNOWN
}

enum BatteryHealthClassification {
  HEALTHY
  LIMITED
  NEEDS_MAINTENANCE
  REPLACEMENT_REQUIRED
  UNSAFE
  UNKNOWN
}

enum BatteryHealthSource {
  AGE_BASED_ESTIMATION
  LIFECYCLE_SIMULATION
  SIMULATED_DIAGNOSTIC
  MANUAL_INSPECTION
  UNKNOWN
}`);
}

// Modify Vehicle model
const vehicleReplacement = `model Vehicle {
  id                      String                     @id @default(auto()) @map("_id") @db.ObjectId
  userId                  String                     @db.ObjectId
  name                    String
  plateNumber             String                     @unique
  vinNumber               String?                    @unique
  brand                   String?
  model                   String?
  manufactureYear         Int?
  purchaseDate            DateTime?
  currentMileageKm        Float?                     @default(0)
  batteryType             String
  batteryOwnershipType    BatteryOwnershipType       @default(UNKNOWN)
  color                   String?
  vehicleImageUrl         String?
  registrationDocumentUrl String?
  preferredStationId      String?
  currentBatteryId        String?
  note                    String?
  isDeleted               Boolean                    @default(false)
  deletedAt               DateTime?
  deletedBy               String?
  vehicleModelId          String?                    @db.ObjectId
  batteryCount            Int                        @default(1)
  status                  VehicleStatus              @default(ACTIVE)
  user                    User                       @relation(fields: [userId], references: [id], onDelete: Cascade)
  vehicleModel            VehicleModel?              @relation(fields: [vehicleModelId], references: [id], onDelete: SetNull)
  batteryAssignments      VehicleBatteryAssignment[]
  batteryHistories        VehicleBatteryHistory[]
  mileageHistories        VehicleMileageHistory[]
  replacementRequests     ReplacementRequest[]
  bookings                Booking[]
  swapTransactions        SwapTransaction[]
  createdAt               DateTime                   @default(now())
  updatedAt               DateTime                   @updatedAt

  @@index([userId])
  @@index([status])
  @@index([vehicleModelId])
  @@map("vehicles")
}`;

schema = schema.replace(/model Vehicle \{[\s\S]*?@@map\("vehicles"\)\n\}/, vehicleReplacement);

// Modify Battery model
const batteryReplacement = `model Battery {
  id                          String                     @id @default(auto()) @map("_id") @db.ObjectId
  batteryCode                 String                     @unique
  qrCodeValue                 String?
  serialNumber                String?                    @unique
  soc                         Int
  soh                         Float
  temperature                 Float
  voltage                     Float
  type                        String?
  batteryTypeId               String?                    @db.ObjectId
  stationId                   String?                    @db.ObjectId
  cycleCount                  Int                        @default(0)
  manufacturer                String?
  manufacturedDate            DateTime?
  activatedDate               DateTime?
  ratedCapacityAh             Float?
  simulatedMeasuredCapacityAh Float?
  accumulatedMileageKm        Float?                     @default(0)
  estimatedSoH                Float?
  healthClassification        BatteryHealthClassification @default(UNKNOWN)
  healthSource                BatteryHealthSource        @default(UNKNOWN)
  currentVehicleId            String?
  lastEstimatedAt             DateTime?
  safetyState                 BatterySafetyState         @default(UNKNOWN)
  operationalStatus           BatteryOperationalStatus   @default(AVAILABLE)
  lastHealthCheckAt           DateTime?
  status                      BatteryStatus              @default(CHARGING)
  slotId                      String?                    @db.ObjectId
  slot                        BatterySlot?               @relation("SlotBattery", fields: [slotId], references: [id], onDelete: SetNull)
  batteryType                 BatteryType?               @relation(fields: [batteryTypeId], references: [id], onDelete: SetNull)
  station                     Station?                   @relation(fields: [stationId], references: [id], onDelete: SetNull)
  bookings                    Booking[]
  batteryInTransactions       SwapTransaction[]          @relation("BatteryInTransactions")
  batteryOutTransactions      SwapTransaction[]          @relation("BatteryOutTransactions")
  maintenanceRecords          MaintenanceRecord[]
  healthLogs                  BatteryHealthLog[]
  vehicleAssignments          VehicleBatteryAssignment[]
  vehicleHistories            VehicleBatteryHistory[]
  replacementRequests         ReplacementRequest[]
  lifecycleEvents             BatteryLifecycleEvent[]
  reservations                BatteryReservation[]
  inspections                 BatteryInspection[]
  lastUpdated                 DateTime                   @default(now())
  createdAt                   DateTime                   @default(now())
  updatedAt                   DateTime                   @updatedAt

  @@index([status])
  @@index([batteryTypeId])
  @@index([stationId, operationalStatus, safetyState])
  @@map("batteries")
}`;

schema = schema.replace(/model Battery \{[\s\S]*?@@map\("batteries"\)\n\}/, batteryReplacement);


// Append new models
if (!schema.includes('model VehicleMileageHistory')) {
  schema += `\n
model VehicleMileageHistory {
  id                String   @id @default(auto()) @map("_id") @db.ObjectId
  vehicleId         String   @db.ObjectId
  previousMileageKm Float?
  newMileageKm      Float
  differenceKm      Float?
  recordedAt        DateTime @default(now())
  recordedBy        String?
  note              String?
  vehicle           Vehicle  @relation(fields: [vehicleId], references: [id], onDelete: Cascade)

  @@index([vehicleId])
  @@map("vehicle_mileage_history")
}

model VehicleBatteryHistory {
  id                 String    @id @default(auto()) @map("_id") @db.ObjectId
  vehicleId          String    @db.ObjectId
  batteryId          String    @db.ObjectId
  installedAt        DateTime  @default(now())
  removedAt          DateTime?
  installedStationId String?
  removedStationId   String?
  installedByStaffId String?
  removedByStaffId   String?
  installationReason String?
  removalReason      String?
  current            Boolean   @default(true)
  vehicle            Vehicle   @relation(fields: [vehicleId], references: [id], onDelete: Cascade)
  battery            Battery   @relation(fields: [batteryId], references: [id], onDelete: Cascade)
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt

  @@index([vehicleId])
  @@index([batteryId])
  @@map("vehicle_battery_history")
}
`;
}

fs.writeFileSync(schemaPath, schema);
console.log('Schema patched.');
