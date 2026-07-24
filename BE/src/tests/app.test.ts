import { describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../app";

describe("service metadata", () => {
  it("returns the API health payload", async () => {
    const response = await request(app).get("/api/v1/health").expect(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe("ok");
    expect(response.headers["cache-control"]).toContain("no-store");
    expect(response.headers.etag).toBeUndefined();
  });

  it("does not return 304 for conditional API requests", async () => {
    const response = await request(app)
      .get("/api/v1/health")
      .set("If-None-Match", 'W/"stale-api-response"')
      .expect(200);
    expect(response.body.data.status).toBe("ok");
  });

  it("returns a valid OpenAPI document", async () => {
    const response = await request(app).get("/api-docs.json").expect(200);
    expect(response.body.openapi).toBe("3.0.3");
    expect(response.body.components.securitySchemes.bearerAuth.scheme).toBe("bearer");
  });

  it("returns a standardized not-found error", async () => {
    const response = await request(app).get("/route-that-does-not-exist").expect(404);
    expect(response.body.success).toBe(false);
  });

  it("rejects an invalid MongoDB ObjectId before the repository", async () => {
    const response = await request(app).get("/api/batteries/not-an-object-id").expect(400);
    expect(response.body.code).toBe("VALIDATION_ERROR");
    expect(response.body.requestId).toBe(response.headers["x-request-id"]);
  });

  it("protects staff and report APIs at the backend", async () => {
    await request(app).post("/api/staff/bookings/lookup").send({}).expect(401);
    await request(app).get("/api/reports/analytics").expect(401);
  });
});
