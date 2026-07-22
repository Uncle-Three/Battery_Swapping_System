import { describe, expect, it } from "vitest";
import { createStationAssignmentSchema } from "../modules/station-assignments/station-assignment.validation";
import { checkInSchema } from "../modules/staff-swaps/staff-swap.validation";

const userId = "6a53161d8786b87f8be53db2";
const stationId = "6a551f888ea51ca3f394577f";
const serviceBayId = "6a551f888ea51ca3f3945780";

describe("station assignment and staff bay validation", () => {
  it("accepts a persisted station assignment with role and shift", () => {
    expect(createStationAssignmentSchema.safeParse({
      userId, stationId, assignmentRole: "STAFF", shift: "Ca sáng",
    }).success).toBe(true);
  });

  it("rejects an assignment with a mismatched or missing role", () => {
    expect(createStationAssignmentSchema.safeParse({ userId, stationId, shift: "Ca sáng" }).success).toBe(false);
    expect(createStationAssignmentSchema.safeParse({ userId, stationId, assignmentRole: "MEMBER" }).success).toBe(false);
  });

  it("requires staff to select a real service bay at check-in", () => {
    expect(checkInSchema.safeParse({ stationId, serviceBayId }).success).toBe(true);
    expect(checkInSchema.safeParse({ stationId }).success).toBe(false);
    expect(checkInSchema.safeParse({ stationId, serviceBayId: "invalid" }).success).toBe(false);
  });
});
