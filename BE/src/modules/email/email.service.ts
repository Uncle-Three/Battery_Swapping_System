import nodemailer from "nodemailer";
import { env } from "../../config/env";
import { emailTemplates } from "./email.templates";
import type {
  BatteryInspectionEmailData,
  BookingEmailData,
  EmailDeliveryResult,
  EmailMessage,
  EmailVerificationData,
  MaintenanceEmailData,
  PaymentEmailData,
  SwapCompletedEmailData,
  SwapSummaryReportEmailData,
  WarrantyEmailData,
} from "./email.types";

const isEmailConfigured = () => Boolean(env.APP_MAIL_ENABLED && env.MAIL_USER && env.MAIL_PASS);

const mailTransporter = nodemailer.createTransport({
  host: env.MAIL_HOST,
  port: env.MAIL_PORT,
  secure: env.MAIL_SECURE,
  requireTLS: !env.MAIL_SECURE,
  connectionTimeout: 10_000,
  greetingTimeout: 10_000,
  socketTimeout: 10_000,
  auth: {
    user: env.MAIL_USER,
    pass: env.MAIL_PASS,
  },
});

const send = async (message: EmailMessage): Promise<EmailDeliveryResult> => {
  if (!isEmailConfigured()) {
    console.warn(`[email] skipped "${message.subject}" to ${message.to}: email delivery is disabled or incomplete`);
    if (env.NODE_ENV !== "production" && env.APP_MAIL_LOG_MOCK_BODY) console.info(message.text);
    return { sent: false, skipped: true };
  }

  try {
    const info = await mailTransporter.sendMail({
      from: env.MAIL_FROM,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
    return { sent: true, skipped: false, messageId: info.messageId };
  } catch (error) {
    console.error(`[email] failed "${message.subject}" to ${message.to}`, error);
    return { sent: false, skipped: false };
  }
};

export const emailService = {
  isConfigured: isEmailConfigured,
  verifyConnection: async () => {
    if (!isEmailConfigured()) return { connected: false, skipped: true };
    try {
      await mailTransporter.verify();
      return { connected: true, skipped: false };
    } catch (error) {
      console.error("[email] Gmail SMTP verification failed", error);
      return { connected: false, skipped: false };
    }
  },
  sendVerificationEmail: (data: EmailVerificationData) => send(emailTemplates.verifyEmail(data)),
  sendEmailVerified: (data: Pick<EmailVerificationData, "customerName" | "customerEmail">) => send(emailTemplates.emailVerified(data)),
  sendPaymentRequested: (data: PaymentEmailData) => send(emailTemplates.paymentRequested(data)),
  sendPaymentFailed: (data: PaymentEmailData) => send(emailTemplates.paymentFailed(data)),
  sendBookingApproved: (data: BookingEmailData) => send(emailTemplates.bookingApproved(data)),
  sendBookingRejected: (data: BookingEmailData) => send(emailTemplates.bookingRejected(data)),
  sendBookingRescheduled: (data: BookingEmailData) => send(emailTemplates.bookingRescheduled(data)),
  sendBatteryInspectionCompleted: (data: BatteryInspectionEmailData) => send(emailTemplates.batteryInspectionCompleted(data)),
  sendMaintenanceStatusChanged: (data: MaintenanceEmailData) => send(emailTemplates.maintenanceStatusChanged(data)),
  sendSwapCompleted: (data: SwapCompletedEmailData) => send(emailTemplates.swapCompleted(data)),
  sendWarrantyIssued: (data: WarrantyEmailData) => send(emailTemplates.warrantyIssued(data)),
  sendSwapSummaryReport: (data: SwapSummaryReportEmailData) => send(emailTemplates.swapSummaryReport(data)),
  sendGenericEmail: (data: { to: string; subject: string; text: string; html?: string }) =>
    send({ to: data.to, subject: data.subject, text: data.text, html: data.html }),
};
