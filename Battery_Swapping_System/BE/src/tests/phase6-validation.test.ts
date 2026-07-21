import { describe, expect, it } from "vitest";
import { analyticsQuerySchema } from "../modules/reports/report.validation";
import { notificationService } from "../modules/notifications/notification.service";
import { paymentService } from "../modules/payments/payment.service";
import { paymentRepository } from "../modules/payments/payment.repository";

describe("phase 6 reporting validation", () => {
  it("accepts supported aggregation periods", () => expect(analyticsQuerySchema.safeParse({ period: "year" }).success).toBe(true));
  it("rejects arbitrary aggregation periods", () => expect(analyticsQuerySchema.safeParse({ period: "all-time" }).success).toBe(false));
  it("defaults to month", () => expect(analyticsQuerySchema.parse({}).period).toBe("month"));
});

describe("phase 6 notification service shape", () => {
  it("notificationService exposes listMine", () => expect(typeof notificationService.listMine).toBe("function"));
  it("notificationService exposes markRead", () => expect(typeof notificationService.markRead).toBe("function"));
});

describe("phase 6 payment service shape", () => {
  it("paymentService exposes getBookingPaymentStatus", () => expect(typeof paymentService.getBookingPaymentStatus).toBe("function"));
  it("paymentService exposes initiateVNPayBookingPayment", () => expect(typeof paymentService.initiateVNPayBookingPayment).toBe("function"));
  it("paymentRepository exposes findBookingPaymentStatus", () => expect(typeof paymentRepository.findBookingPaymentStatus).toBe("function"));
  it("paymentRepository exposes createPendingVNPayBookingPayment", () => expect(typeof paymentRepository.createPendingVNPayBookingPayment).toBe("function"));
});
