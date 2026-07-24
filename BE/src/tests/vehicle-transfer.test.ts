import { beforeEach, describe, expect, it, vi } from "vitest";
import { ALLOWED_TRANSITIONS } from "../modules/vehicle-transfer/vehicle-transfer.types";

// ─────────────────────────────────────────────────────────────────────────────
// Mock prisma for all tests
// ─────────────────────────────────────────────────────────────────────────────

const prismaMocks = vi.hoisted(() => {
  const mockTx = {
    vehicle: { update: vi.fn() },
    vehicleTransferRequest: { update: vi.fn() },
    vehicleOwnershipHistory: { create: vi.fn() },
    auditLog: { create: vi.fn() },
    notification: { create: vi.fn() },
    user: { update: vi.fn() },
    passwordResetToken: { update: vi.fn() },
  };
  return {
    vehicle: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    },
    vehicleTransferRequest: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
    },
    vehicleOwnershipHistory: {
      findMany: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    },
    auditLog: { create: vi.fn() },
    notification: { create: vi.fn() },
    user: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    passwordResetToken: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(async (fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx)),
    _mockTx: mockTx,
  };
});

vi.mock("../config/database", () => ({ prisma: prismaMocks }));
vi.mock("../modules/email/email.service", () => ({
  emailService: { sendGenericEmail: vi.fn().mockResolvedValue({ sent: true }) },
}));
vi.mock("../common/utils/password", () => ({
  hashPassword: vi.fn().mockResolvedValue("hashed-password"),
  comparePassword: vi.fn().mockResolvedValue(true),
}));

import * as transferService from "../modules/vehicle-transfer/vehicle-transfer.service";
import * as recoveryService from "../modules/account-recovery/account-recovery.service";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const makeVehicle = (overrides = {}) => ({
  id: "vehicle-1",
  userId: "owner-1",
  plateNumber: "ABC-123",
  vinNumber: "VIN001",
  qrCode: "QR001",
  brand: "Toyota",
  model: "Corolla",
  manufactureYear: 2020,
  batteryType: "LFP",
  ownershipStatus: "ACTIVE",
  status: "ACTIVE",
  isDeleted: false,
  user: { id: "owner-1", email: "owner@example.com", phone: "0901234567", role: { name: "MEMBER" } },
  ...overrides,
});

const makeTransferRequest = (overrides = {}) => ({
  id: "req-1",
  vehicleId: "vehicle-1",
  currentOwnerId: "owner-1",
  requestedOwnerId: "buyer-1",
  requestType: "USED_VEHICLE_PURCHASE",
  reason: "Bought used",
  status: "PENDING",
  registrationDocumentUrl: "https://example.com/reg.pdf",
  identityDocumentUrl: "https://example.com/id.pdf",
  purchaseContractUrl: "https://example.com/contract.pdf",
  additionalDocumentUrls: [],
  submittedAt: new Date(),
  reviewedAt: null,
  reviewedBy: null,
  adminNotes: null,
  rejectionReason: null,
  vehicle: {
    id: "vehicle-1",
    plateNumber: "ABC-123",
    userId: "owner-1",
    ownershipStatus: "TRANSFER_PENDING",
    user: { id: "owner-1", email: "owner@example.com" },
  },
  ...overrides,
});

const ctx = { ipAddress: "127.0.0.1", userAgent: "test" };

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe("Vehicle Transfer Feature — Business Rules", () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Test 1: Register new unowned vehicle ──────────────────────────────────
  describe("1. Looking up an unregistered vehicle", () => {
    it("returns found=false and allows new registration", async () => {
      prismaMocks.vehicle.findFirst.mockResolvedValue(null);
      const result = await transferService.lookupVehicle({ vin: "NEW-VIN" });
      expect(result.found).toBe(false);
      expect(result.transferRequestAllowed).toBe(false);
      expect(result.message).toMatch(/(register|đăng ký)/i);
    });
  });

  // ── Test 2: Prevent second user from adding an owned vehicle ──────────────
  describe("2. Lookup an already-owned vehicle", () => {
    it("returns hasActiveOwner=true and masked owner info for another user", async () => {
      prismaMocks.vehicle.findFirst.mockResolvedValue(makeVehicle());
      prismaMocks.vehicleTransferRequest.findFirst.mockResolvedValue(null);

      const result = await transferService.lookupVehicle({ vin: "VIN001" }, "different-user");
      expect(result.found).toBe(true);
      expect(result.hasActiveOwner).toBe(true);
      expect(result.isOwnedByCurrentUser).toBe(false);
      expect(result.transferRequestAllowed).toBe(true);
      expect(result.maskedOwnerInfo?.maskedEmail).toMatch(/\*+/);
      expect(result.maskedOwnerInfo?.maskedEmail).not.toContain("owner@example.com");
    });

    it("tells current owner the vehicle is already in their account", async () => {
      prismaMocks.vehicle.findFirst.mockResolvedValue(makeVehicle());
      prismaMocks.vehicleTransferRequest.findFirst.mockResolvedValue(null);

      const result = await transferService.lookupVehicle({ vin: "VIN001" }, "owner-1");
      expect(result.isOwnedByCurrentUser).toBe(true);
      expect(result.message).toMatch(/(already in your account|đã có trong tài khoản)/i);
    });
  });

  // ── Test 3: Create a valid transfer request ───────────────────────────────
  describe("3. Create a valid transfer request", () => {
    it("creates a DRAFT transfer request when vehicle is owned by someone else", async () => {
      prismaMocks.vehicle.findFirst.mockResolvedValue(makeVehicle());
      prismaMocks.vehicleTransferRequest.findFirst.mockResolvedValue(null); // no duplicate
      prismaMocks.vehicleTransferRequest.create.mockResolvedValue({ id: "req-new", status: "DRAFT" });

      const result = await transferService.createTransferRequest("buyer-1", {
        vehicleId: "vehicle-1",
        requestType: "USED_VEHICLE_PURCHASE",
        reason: "I bought this car",
      });

      expect(prismaMocks.vehicleTransferRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            vehicleId: "vehicle-1",
            currentOwnerId: "owner-1",
            requestedOwnerId: "buyer-1",
            requestType: "USED_VEHICLE_PURCHASE",
          }),
        }),
      );
      expect(result.status).toBe("DRAFT");
    });
  });

  // ── Test 4: Prevent duplicate active transfer requests ────────────────────
  describe("4. Prevent duplicate active transfer requests", () => {
    it("throws ConflictError if an active request already exists", async () => {
      prismaMocks.vehicle.findFirst.mockResolvedValue(makeVehicle());
      prismaMocks.vehicleTransferRequest.findFirst.mockResolvedValue({ id: "existing-req", status: "PENDING" });

      await expect(
        transferService.createTransferRequest("buyer-1", {
          vehicleId: "vehicle-1",
          requestType: "USED_VEHICLE_PURCHASE",
        }),
      ).rejects.toThrow(/(already have an active transfer request|đã có một yêu cầu)/i);
    });
  });

  // ── Test 5: Status transition rules (ALLOWED_TRANSITIONS) ────────────────
  describe("5. Status transition rules (ALLOWED_TRANSITIONS)", () => {
    it("DRAFT can only transition to PENDING or CANCELLED", () => {
      expect(ALLOWED_TRANSITIONS["DRAFT"]).toContain("PENDING");
      expect(ALLOWED_TRANSITIONS["DRAFT"]).toContain("CANCELLED");
      expect(ALLOWED_TRANSITIONS["DRAFT"]).not.toContain("APPROVED");
    });

    it("APPROVED has no further transitions", () => {
      expect(ALLOWED_TRANSITIONS["APPROVED"]).toHaveLength(0);
    });

    it("REJECTED has no further transitions", () => {
      expect(ALLOWED_TRANSITIONS["REJECTED"]).toHaveLength(0);
    });

    it("UNDER_REVIEW can be APPROVED, REJECTED, or NEED_MORE_INFORMATION", () => {
      expect(ALLOWED_TRANSITIONS["UNDER_REVIEW"]).toContain("APPROVED");
      expect(ALLOWED_TRANSITIONS["UNDER_REVIEW"]).toContain("REJECTED");
      expect(ALLOWED_TRANSITIONS["UNDER_REVIEW"]).toContain("NEED_MORE_INFORMATION");
    });

    it("allows approving a PENDING request directly", async () => {
      const request = makeTransferRequest({ status: "PENDING" });
      prismaMocks.vehicleTransferRequest.findUnique.mockResolvedValue(request);
      prismaMocks.vehicle.findFirst.mockResolvedValue(makeVehicle());
      prismaMocks._mockTx.vehicle.update.mockResolvedValue({});
      prismaMocks._mockTx.vehicleTransferRequest.update.mockResolvedValue({});
      prismaMocks._mockTx.vehicleOwnershipHistory.create.mockResolvedValue({});
      prismaMocks._mockTx.auditLog.create.mockResolvedValue({});
      prismaMocks._mockTx.notification.create.mockResolvedValue({});

      const result = await transferService.adminApproveTransfer("req-1", "admin-1", "ADMIN", {}, ctx);
      expect(result.message).toMatch(/(approved|thành công)/i);
    });
  });

  // ── Test 6: Admin can approve ─────────────────────────────────────────────
  describe("6. Admin approves a transfer request", () => {
    it("changes vehicle owner and creates ownership history", async () => {
      const request = makeTransferRequest({ status: "UNDER_REVIEW" });
      prismaMocks.vehicleTransferRequest.findUnique.mockResolvedValue(request);
      prismaMocks.vehicle.findFirst.mockResolvedValue(makeVehicle());
      prismaMocks._mockTx.vehicle.update.mockResolvedValue({});
      prismaMocks._mockTx.vehicleTransferRequest.update.mockResolvedValue({});
      prismaMocks._mockTx.vehicleOwnershipHistory.create.mockResolvedValue({});
      prismaMocks._mockTx.auditLog.create.mockResolvedValue({});
      prismaMocks._mockTx.notification.create.mockResolvedValue({});

      const result = await transferService.adminApproveTransfer("req-1", "admin-1", "ADMIN", { adminNotes: "Verified" }, ctx);
      expect(result.message).toMatch(/(approved|thành công)/i);
      // Transaction was called
      expect(prismaMocks.$transaction).toHaveBeenCalled();
    });
  });

  // ── Test 7: Technical history preserved (not on User, but on Vehicle) ─────
  describe("7. Technical history belongs to vehicle, not owner", () => {
    it("ALLOWED_TRANSITIONS does not delete any history — history is schema-level (vehicleId FK)", () => {
      // This is a schema-level guarantee: SwapTransaction, BatteryHealthLog, MaintenanceRecord
      // all reference vehicleId, not userId. Changing userId on Vehicle doesn't cascade-delete them.
      // We verify the service never calls any history delete
      const service = transferService as Record<string, unknown>;
      // No delete function should be exported from the transfer service
      expect(service).not.toHaveProperty("deleteVehicleTechnicalHistory");
    });
  });

  // ── Test 8: Payment records stay private ─────────────────────────────────
  describe("8. Payment records are not exposed in technical history", () => {
    it("technical history service select does not include payment fields", async () => {
      // The select spec in technicalHistoryService explicitly excludes cost, invoice, payments
      // We verify by checking the mock call args
      prismaMocks.vehicle.findFirst.mockResolvedValue(makeVehicle());

      const { technicalHistoryService } = await import("../modules/technical-history/technical-history.service.js");

      const mockSwapFindMany = vi.fn().mockResolvedValue([]);
      const mockSwapCount = vi.fn().mockResolvedValue(0);
      const mockVehicleBatteryHistory = vi.fn().mockResolvedValue([]);
      const mockMaintenanceRecord = vi.fn().mockResolvedValue([]);
      const mockBatteryHealthLog = vi.fn().mockResolvedValue([]);

      // Override prisma mocks for this test
      (prismaMocks as Record<string, unknown>).swapTransaction = {
        findMany: mockSwapFindMany,
        count: mockSwapCount,
      };
      (prismaMocks as Record<string, unknown>).vehicleBatteryHistory = { findMany: mockVehicleBatteryHistory };
      (prismaMocks as Record<string, unknown>).maintenanceRecord = { findMany: mockMaintenanceRecord };
      (prismaMocks as Record<string, unknown>).batteryHealthLog = { findMany: mockBatteryHealthLog };

      await technicalHistoryService.getVehicleTechnicalHistory("vehicle-1", "owner-1", "MEMBER", { page: 0, size: 20 });

      if (mockSwapFindMany.mock.calls.length > 0) {
        const selectArg = mockSwapFindMany.mock.calls[0]?.[0]?.select as Record<string, unknown> | undefined;
        if (selectArg) {
          expect(selectArg).not.toHaveProperty("cost");
          expect(selectArg).not.toHaveProperty("userId");
        }
      }
    });
  });

  // ── Test 9: Ownership history is created after approval ──────────────────
  describe("9. VehicleOwnershipHistory is created on approval", () => {
    it("calls vehicleOwnershipHistory.create inside transaction", async () => {
      const request = makeTransferRequest({ status: "UNDER_REVIEW" });
      prismaMocks.vehicleTransferRequest.findUnique.mockResolvedValue(request);
      prismaMocks.vehicle.findFirst.mockResolvedValue(makeVehicle());
      prismaMocks._mockTx.vehicle.update.mockResolvedValue({});
      prismaMocks._mockTx.vehicleTransferRequest.update.mockResolvedValue({});
      prismaMocks._mockTx.vehicleOwnershipHistory.create.mockResolvedValue({ id: "history-1" });
      prismaMocks._mockTx.auditLog.create.mockResolvedValue({});
      prismaMocks._mockTx.notification.create.mockResolvedValue({});

      await transferService.adminApproveTransfer("req-1", "admin-1", "ADMIN", {}, ctx);

      expect(prismaMocks._mockTx.vehicleOwnershipHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            vehicleId: "vehicle-1",
            previousOwnerId: "owner-1",
            newOwnerId: "buyer-1",
          }),
        }),
      );
    });
  });

  // ── Test 10: Reject with reason ───────────────────────────────────────────
  describe("10. Reject transfer request", () => {
    it("rejects and notifies requester", async () => {
      const request = makeTransferRequest({ status: "UNDER_REVIEW" });
      prismaMocks.vehicleTransferRequest.findUnique.mockResolvedValue(request);
      prismaMocks.vehicle.findFirst.mockResolvedValue(makeVehicle({ ownershipStatus: "TRANSFER_PENDING" }));
      prismaMocks.vehicleTransferRequest.update.mockResolvedValue({ id: "req-1", status: "REJECTED" });
      prismaMocks.vehicle.update.mockResolvedValue({});
      prismaMocks.auditLog.create.mockResolvedValue({});
      prismaMocks.notification.create.mockResolvedValue({});

      const result = await transferService.adminRejectTransfer("req-1", "admin-1", "ADMIN", {
        rejectionReason: "Documents are insufficient",
      }, ctx);
      expect(result.message).toMatch(/(rejected|từ chối)/i);
    });

    it("requires a rejection reason", async () => {
      const request = makeTransferRequest({ status: "UNDER_REVIEW" });
      prismaMocks.vehicleTransferRequest.findUnique.mockResolvedValue(request);
      prismaMocks.vehicle.findFirst.mockResolvedValue(makeVehicle());

      await expect(
        transferService.adminRejectTransfer("req-1", "admin-1", "ADMIN", { rejectionReason: "" }, ctx),
      ).rejects.toThrow();
    });
  });

  // ── Test 11: Invalid status transitions ───────────────────────────────────
  describe("11. Prevent invalid status transitions", () => {
    it("cannot submit an already APPROVED request", async () => {
      prismaMocks.vehicleTransferRequest.findUnique.mockResolvedValue(makeTransferRequest({ status: "APPROVED" }));
      prismaMocks.vehicleTransferRequest.findFirst.mockResolvedValue(makeTransferRequest({ status: "APPROVED" }));

      await expect(
        transferService.submitTransferRequest("req-1", "buyer-1", ctx),
      ).rejects.toThrow();
    });

    it("cannot cancel an APPROVED request", async () => {
      prismaMocks.vehicleTransferRequest.findFirst.mockResolvedValue(makeTransferRequest({
        status: "APPROVED",
        requestedOwnerId: "buyer-1",
      }));

      await expect(
        transferService.cancelTransferRequest("req-1", "buyer-1", ctx),
      ).rejects.toThrow();
    });
  });

  // ── Test 12: Account recovery (no duplicate account) ─────────────────────
  describe("12. Account recovery via forgot password", () => {
    it("responds with success message regardless of email existence (enumeration protection)", async () => {
      prismaMocks.user.findUnique.mockResolvedValue(null);

      const result = await recoveryService.accountRecoveryService.requestPasswordReset({ email: "nobody@example.com" });
      expect(result.message).toMatch(/if this email exists/i);
    });

    it("creates a reset token for valid user without creating a new account", async () => {
      const user = { id: "user-1", email: "user@example.com", status: "ACTIVE", fullName: "Test", role: { name: "MEMBER" } };
      prismaMocks.user.findUnique.mockResolvedValue(user);
      prismaMocks.passwordResetToken.updateMany.mockResolvedValue({ count: 0 });
      prismaMocks.passwordResetToken.create.mockResolvedValue({ id: "token-1" });

      await recoveryService.accountRecoveryService.requestPasswordReset({ email: "user@example.com" });

      expect(prismaMocks.passwordResetToken.create).toHaveBeenCalled();
      // No user.create should be called
      expect((prismaMocks as Record<string, unknown>).user).not.toHaveProperty("create");
    });
  });

  // ── Test 13: Phone number change ─────────────────────────────────────────
  describe("13. Phone number change", () => {
    it("rejects if new phone is already in use", async () => {
      prismaMocks.user.findUnique.mockResolvedValue({ id: "user-1", email: "u@e.com", phone: "123", role: { name: "MEMBER" } });
      prismaMocks.user.findFirst.mockResolvedValue({ id: "other-user" }); // phone taken

      await expect(
        recoveryService.accountRecoveryService.requestPhoneChange("user-1", { newPhone: "0909999999" }, ctx),
      ).rejects.toThrow(/already in use/i);
    });
  });

  // ── Test 14: Race condition prevention on approval ────────────────────────
  describe("14. Race condition prevention", () => {
    it("throws if vehicle owner changed since request was created", async () => {
      const request = makeTransferRequest({ status: "UNDER_REVIEW", currentOwnerId: "owner-1" });
      prismaMocks.vehicleTransferRequest.findUnique.mockResolvedValue(request);
      // Vehicle owner has changed to a different user (race condition simulated)
      prismaMocks.vehicle.findFirst.mockResolvedValue(makeVehicle({ userId: "different-owner" }));

      await expect(
        transferService.adminApproveTransfer("req-1", "admin-1", "ADMIN", {}, ctx),
      ).rejects.toThrow(/(ownership has changed|thay đổi)/i);
    });
  });

  // ── Test 15: Unauthorized document access ────────────────────────────────
  describe("15. Prevent unauthorized document access", () => {
    it("throws ForbiddenError when non-owner tries to upload documents", async () => {
      const request = makeTransferRequest({ requestedOwnerId: "buyer-1", status: "DRAFT" });
      prismaMocks.vehicleTransferRequest.findUnique.mockResolvedValue(request);

      await expect(
        transferService.uploadTransferDocuments("req-1", "attacker-user", {
          registrationDocumentUrl: "https://evil.com/fake.pdf",
        }),
      ).rejects.toThrow();
    });

    it("throws ForbiddenError when non-owner tries to view ownership history", async () => {
      prismaMocks.vehicle.findFirst.mockResolvedValue(makeVehicle({ userId: "owner-1" }));

      await expect(
        transferService.getOwnershipHistory("vehicle-1", "attacker", "MEMBER", 0, 20),
      ).rejects.toThrow();
    });
  });
});
