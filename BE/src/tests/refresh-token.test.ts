import { describe, expect, it } from "vitest";
import { createRefreshToken } from "../common/utils/refresh-token";

describe("refresh token uniqueness", () => {
  it("creates different sessions for rapid logins in the same second", () => {
    const first = createRefreshToken("507f1f77bcf86cd799439011");
    const second = createRefreshToken("507f1f77bcf86cd799439011");
    expect(first.token).not.toBe(second.token);
    expect(first.tokenHash).not.toBe(second.tokenHash);
  });
});
