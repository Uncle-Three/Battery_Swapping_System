import { describe, expect, it, vi } from "vitest";
import { authorizePermission } from "../common/middleware/authorize-permission.middleware";
import { Permissions } from "../constants/permissions";
import { ForbiddenError } from "../common/errors/forbidden-error";

describe("backend permission enforcement", () => {
  it("blocks a member from processing swaps", () => {
    const next = vi.fn();
    authorizePermission(Permissions.SWAPS_PROCESS)({ user: { id: "u", email: "u@example.com", role: "MEMBER", status: "ACTIVE" } } as never, {} as never, next);
    expect(next.mock.calls[0]?.[0]).toBeInstanceOf(ForbiddenError);
  });

  it("allows staff to process swaps", () => {
    const next = vi.fn();
    authorizePermission(Permissions.SWAPS_PROCESS)({ user: { id: "s", email: "s@example.com", role: "STAFF", status: "ACTIVE" } } as never, {} as never, next);
    expect(next).toHaveBeenCalledWith();
  });

  it("blocks staff from management reports", () => {
    const next = vi.fn();
    authorizePermission(Permissions.REPORTS_READ)({ user: { id: "s", email: "s@example.com", role: "STAFF", status: "ACTIVE" } } as never, {} as never, next);
    expect(next.mock.calls[0]?.[0]).toBeInstanceOf(ForbiddenError);
  });
});
