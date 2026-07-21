import nodemailer from "nodemailer";
import { env } from "../../config/env";
import { emailTemplates } from "./email.templates";
import type {
  BatteryInspectionEmailData,
  BookingEmailData,
  EmailMessage,
  MaintenanceEmailData,
  SwapCompletedEmailData,
  WarrantyEmailData,
  SwapSummaryReportEmailData,
} from "./email.types";

const isEmailConfigured = () => Boolean(env.MAIL_USER && env.MAIL_PASS);

const transporter = () =>
  nodemailer.createTransport({
    host: env.MAIL_HOST,
    port: env.MAIL_PORT,
    secure: env.MAIL_SECURE,
    auth: {
      user: env.MAIL_USER,
      pass: env.MAIL_PASS,
    },
  });

const send = async (message: EmailMessage) => {
  if (!isEmailConfigured()) {
    console.warn(`[email] skipped "${message.subject}" to ${message.to}: MAIL_USER/MAIL_PASS is not configured`);
    return { sent: false, skipped: true };
  }

  try {
    await transporter().sendMail({
      from: env.MAIL_FROM,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
    return { sent: true, skipped: false };
  } catch (error) {
    console.error(`[email] failed "${message.subject}" to ${message.to}`, error);
    return { sent: false, skipped: false };
  }
};

export const emailService = {
  sendBookingApproved: (data: BookingEmailData) => send(emailTemplates.bookingApproved(data)),
  sendBookingRejected: (data: BookingEmailData) => send(emailTemplates.bookingRejected(data)),
  sendBookingRescheduled: (data: BookingEmailData) => send(emailTemplates.bookingRescheduled(data)),
  sendBatteryInspectionCompleted: (data: BatteryInspectionEmailData) => send(emailTemplates.batteryInspectionCompleted(data)),
  sendMaintenanceStatusChanged: (data: MaintenanceEmailData) => send(emailTemplates.maintenanceStatusChanged(data)),
  sendSwapCompleted: (data: SwapCompletedEmailData) => send(emailTemplates.swapCompleted(data)),
  sendWarrantyIssued: (data: WarrantyEmailData) => send(emailTemplates.warrantyIssued(data)),
  sendSwapSummaryReport: (data: SwapSummaryReportEmailData) => send(emailTemplates.swapSummaryReport(data)),
};
