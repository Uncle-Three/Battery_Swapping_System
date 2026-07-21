import { describe, expect, it } from "vitest";
import { serializeAuditPayload } from "../common/middleware/audit.middleware";

describe("audit payload serialization", () => {
  it("handles bodyless DELETE requests", () => {
    expect(serializeAuditPayload(undefined)).toBe("Payload: null");
  });

  it("limits stored request payloads", () => {
    expect(serializeAuditPayload({ value: "x".repeat(1_000) }).length).toBeLessThanOrEqual(509);
  });
});
