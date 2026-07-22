import { prisma } from "../src/config/database";

if (process.env.NODE_ENV === "production") {
  throw new Error("Database reset is disabled in production");
}

if (process.env.ALLOW_DATABASE_RESET !== "true") {
  throw new Error("Set ALLOW_DATABASE_RESET=true to confirm the development database reset");
}

const collections: Array<[string, () => Promise<unknown>]> = [
  ["audit_logs", () => prisma.auditLog.deleteMany()],
  ["notifications", () => prisma.notification.deleteMany()],
  ["battery_lifecycle_events", () => prisma.batteryLifecycleEvent.deleteMany()],
  ["replacement_requests", () => prisma.replacementRequest.deleteMany()],
  ["slot_reservations", () => prisma.slotReservation.deleteMany()],
  ["battery_reservations", () => prisma.batteryReservation.deleteMany()],
  ["vehicle_battery_assignments", () => prisma.vehicleBatteryAssignment.deleteMany()],
  ["station_assignments", () => prisma.stationAssignment.deleteMany()],
  ["battery_compatibilities", () => prisma.batteryCompatibility.deleteMany()],
  ["battery_safety_rules", () => prisma.batterySafetyRule.deleteMany()],
  ["refresh_sessions", () => prisma.refreshSession.deleteMany()],
  ["battery_health_logs", () => prisma.batteryHealthLog.deleteMany()],
  ["maintenance_records", () => prisma.maintenanceRecord.deleteMany()],
  ["subscriptions", () => prisma.subscription.deleteMany()],
  ["subscription_packages", () => prisma.subscriptionPackage.deleteMany()],
  ["payment_transactions", () => prisma.paymentTransaction.deleteMany()],
  ["invoices", () => prisma.invoice.deleteMany()],
  ["swap_transactions", () => prisma.swapTransaction.deleteMany()],
  ["bookings", () => prisma.booking.deleteMany()],
  ["vehicles", () => prisma.vehicle.deleteMany()],
  ["batteries", () => prisma.battery.deleteMany()],
  ["battery_slots", () => prisma.batterySlot.deleteMany()],
  ["stations", () => prisma.station.deleteMany()],
  ["wallets", () => prisma.wallet.deleteMany()],
  ["users", () => prisma.user.deleteMany()],
  ["vehicle_models", () => prisma.vehicleModel.deleteMany()],
  ["battery_types", () => prisma.batteryType.deleteMany()],
  ["role_permissions", () => prisma.rolePermission.deleteMany()],
  ["permissions", () => prisma.permission.deleteMany()],
  ["roles", () => prisma.role.deleteMany()],
  ["system_settings", () => prisma.systemSetting.deleteMany()],
];

const main = async (): Promise<void> => {
try {
  for (const [name, clear] of collections) {
    const result = await clear();
    console.log(`Cleared ${name}`, result);
  }
  console.log("MongoDB development data reset completed. Run npm run db:seed to create fresh data.");
} finally {
  await prisma.$disconnect();
}
};

main().catch((error: unknown) => {
  console.error("Failed to reset MongoDB development data", error);
  process.exit(1);
});
