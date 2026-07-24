import { describe, expect, it } from "vitest";
import { authorizePermission } from "../common/middleware/authorize-permission.middleware";
import { ForbiddenError } from "../common/errors/forbidden-error";
import { Permissions } from "../constants/permissions";
import {
  auditQuerySchema, bookingsQuerySchema, cancelBookingSchema, createAssignmentSchema, createBaySchema,
  createMaintenanceSchema, createSlotSchema, inventoryQuerySchema, maintenanceQuerySchema,
  reportQuerySchema, stationParamSchema, updateMaintenanceSchema,
} from "../modules/station-detail/station-detail.validation";

const objectId = "6a551f888ea51ca3f394577f";

describe("station detail request validation", () => {
  it("accepts a valid Mongo station id", () => expect(stationParamSchema.safeParse({ stationId: objectId }).success).toBe(true));
  it("rejects an invalid Mongo station id", () => expect(stationParamSchema.safeParse({ stationId: "bad-id" }).success).toBe(false));
  it("accepts a valid service bay", () => expect(createBaySchema.safeParse({ bayCode: "E9103475", bayName: "Khoang E2E 9103475" }).success).toBe(true));
  it("rejects a bay code outside the E plus 7 digits format", () => expect(createBaySchema.safeParse({ bayCode: "B01", bayName: "Khoang 1" }).success).toBe(false));
  it("rejects a bay with an invalid duration", () => expect(createBaySchema.safeParse({ bayCode: "E9103475", bayName: "Khoang 1", defaultDurationMinutes: 0 }).success).toBe(false));
  it("accepts a valid replacement slot", () => expect(createSlotSchema.safeParse({ bayId: objectId, date: "2026-07-14", startTime: "08:00", endTime: "08:30", capacity: 1 }).success).toBe(true));
  it("rejects a reversed replacement slot", () => expect(createSlotSchema.safeParse({ bayId: objectId, date: "2026-07-14", startTime: "09:00", endTime: "08:30", capacity: 1 }).success).toBe(false));
  it("rejects a zero-capacity replacement slot", () => expect(createSlotSchema.safeParse({ bayId: objectId, date: "2026-07-14", startTime: "08:00", endTime: "08:30", capacity: 0 }).success).toBe(false));
  it("accepts a booking cancellation reason", () => expect(cancelBookingSchema.safeParse({ reason: "Khách yêu cầu hủy lịch" }).success).toBe(true));
  it("rejects a booking cancellation reason shorter than 3 characters", () => expect(cancelBookingSchema.safeParse({ reason: "ab" }).success).toBe(false));
  it("validates assignment role and user id", () => expect(createAssignmentSchema.safeParse({ userId: objectId, assignmentRole: "STAFF", shift: "Ca sáng" }).success).toBe(true));
  it("rejects an unsupported assignment role", () => expect(createAssignmentSchema.safeParse({ userId: objectId, assignmentRole: "MEMBER" }).success).toBe(false));
  it("validates a maintenance incident", () => expect(createMaintenanceSchema.safeParse({ type: "INCIDENT", title: "Mất kết nối", description: "Thiết bị mất kết nối", severity: "HIGH" }).success).toBe(true));
  it("requires resolution text to be valid when supplied", () => expect(updateMaintenanceSchema.safeParse({ status: "RESOLVED", resolution: "Đã thay thiết bị" }).success).toBe(true));
  it("applies safe pagination defaults", () => {
    expect(inventoryQuerySchema.parse({})).toMatchObject({ page: 1, limit: 20 });
    expect(bookingsQuerySchema.parse({})).toMatchObject({ page: 1, limit: 20 });
    expect(maintenanceQuerySchema.parse({})).toMatchObject({ page: 1, limit: 20 });
    expect(auditQuerySchema.parse({})).toMatchObject({ page: 1, limit: 25 });
  });
  it("coerces report date filters", () => expect(reportQuerySchema.parse({ from: "2026-07-01", to: "2026-07-14" }).from).toBeInstanceOf(Date));
});

describe("station detail authorization", () => {
  it("returns a forbidden error for non-admin station settings access", () => {
    const next = ((...args: unknown[]) => { (next as unknown as { calls: unknown[][] }).calls.push(args); }) as unknown as ((error?: unknown) => void) & { calls: unknown[][] };
    next.calls = [];
    authorizePermission(Permissions.SETTINGS_MANAGE)({ user: { id: "staff", email: "s@example.com", role: "STAFF", status: "ACTIVE" } } as never, {} as never, next);
    expect(next.calls[0]?.[0]).toBeInstanceOf(ForbiddenError);
  });
});
