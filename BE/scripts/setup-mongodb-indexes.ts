import { prisma } from "../src/config/database";

type PartialIndex = {
  collection: string;
  name: string;
  field: string;
};

const indexes: PartialIndex[] = [
  { collection: "users", name: "users_phone_partial_unique", field: "phone" },
  { collection: "users", name: "users_rfidCard_partial_unique", field: "rfidCard" },
  { collection: "users", name: "users_licensePlate_partial_unique", field: "licensePlate" },
  { collection: "vehicles", name: "vehicles_vinNumber_partial_unique", field: "vinNumber" },
  { collection: "batteries", name: "batteries_slotId_partial_unique", field: "slotId" },
  { collection: "swap_transactions", name: "swap_transactions_bookingId_partial_unique", field: "bookingId" },
  { collection: "payment_transactions", name: "payment_transactions_vnpTxnRef_partial_unique", field: "vnpTxnRef" },
  { collection: "replacement_requests", name: "replacement_requests_deduplicationKey_partial_unique", field: "deduplicationKey" },
  { collection: "bookings", name: "bookings_bookingCode_partial_unique", field: "bookingCode" },
];

const main = async (): Promise<void> => {
try {
  for (const index of indexes) {
    await prisma.$runCommandRaw({
      createIndexes: index.collection,
      indexes: [{
        key: { [index.field]: 1 },
        name: index.name,
        unique: true,
        partialFilterExpression: { [index.field]: { $type: "string" } },
      }],
    });
    console.log(`Ensured ${index.name}`);
  }
  for (const collection of ["slot_reservations", "battery_reservations"]) {
    await prisma.$runCommandRaw({
      createIndexes: collection,
      indexes: [{
        key: { reservationKey: 1 },
        name: `${collection}_active_reservationKey_unique`,
        unique: true,
        partialFilterExpression: { status: "ACTIVE" },
      }],
    });
    console.log(`Ensured ${collection} active reservation uniqueness`);
  }
} finally {
  await prisma.$disconnect();
}
};

main().catch((error: unknown) => {
  console.error("Failed to configure MongoDB indexes", error);
  process.exit(1);
});
