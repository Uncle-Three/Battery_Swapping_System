import { API_ENDPOINTS } from '../constants/endpoints';
import apiClient, { unwrapData } from './apiClient';
import type { BookingPaymentStatus } from '../types';

export type VNPayReturnResult = {
  success: boolean;
  txnRef: string;
  amount: number;
  message: string;
  responseCode: string;
  signatureValid?: boolean;
  bookingId?: string | null;
};

export const paymentService = {
  getVNPayReturn: async (params: Record<string, string>) =>
    unwrapData<VNPayReturnResult>(await apiClient.get(API_ENDPOINTS.PAYMENTS.VNPAY_RETURN, { params })),
  getBookingPaymentStatus: async (bookingId: string) =>
    unwrapData<BookingPaymentStatus>(await apiClient.get(API_ENDPOINTS.PAYMENTS.BOOKING_STATUS(bookingId))),
  initiateVNPayBookingPayment: async (bookingId: string) =>
    unwrapData<{ paymentUrl: string; txnRef: string; amount: number }>(
      await apiClient.post(API_ENDPOINTS.PAYMENTS.BOOKING_VNPAY(bookingId), {})
    ),
};
