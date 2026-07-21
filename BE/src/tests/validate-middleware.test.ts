import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { validate } from "../common/middleware/validate.middleware";

describe("query validation on Express 5", () => {
  it("overrides the getter-only query property with parsed data", () => {
    const request = Object.create({});
    Object.defineProperty(request, "query", { get: () => ({ page: "2" }), configurable: true });
    const next = vi.fn();
    validate({ query: z.object({ page: z.coerce.number() }) })(request, {} as never, next);
    expect(request.query.page).toBe(2);
    expect(next).toHaveBeenCalledWith();
  });
});
