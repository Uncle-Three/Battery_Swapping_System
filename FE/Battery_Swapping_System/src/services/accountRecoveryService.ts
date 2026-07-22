import apiClient from "./apiClient";

type ForgotPasswordInput = { email: string };
type VerifyOtpInput = { email: string; otp: string };
type ResetPasswordInput = { email: string; otp: string; newPassword: string };
type RequestPhoneChangeInput = { newPhone: string };
type VerifyPhoneChangeInput = { otp: string };
type ManualRecoveryInput = { contactEmail: string; contactPhone?: string; description: string; documentUrls?: string[] };

export const accountRecoveryService = {
  requestPasswordReset: async (data: ForgotPasswordInput): Promise<{ message: string }> => {
    const res = await apiClient.post<{ message: string }>("/auth/forgot-password", data);
    return res.data;
  },

  verifyOtp: async (data: VerifyOtpInput): Promise<{ data: { valid: boolean }; message: string }> => {
    const res = await apiClient.post<{ data: { valid: boolean }; message: string }>("/auth/verify-reset-otp", data);
    return res.data;
  },

  resetPassword: async (data: ResetPasswordInput): Promise<{ message: string }> => {
    const res = await apiClient.post<{ message: string }>("/auth/reset-password", data);
    return res.data;
  },

  requestPhoneChange: async (data: RequestPhoneChangeInput): Promise<{ message: string }> => {
    const res = await apiClient.post<{ message: string }>("/account/change-phone/request", data);
    return res.data;
  },

  verifyPhoneChange: async (data: VerifyPhoneChangeInput): Promise<{ message: string }> => {
    const res = await apiClient.post<{ message: string }>("/account/change-phone/verify", data);
    return res.data;
  },

  requestManualRecovery: async (data: ManualRecoveryInput): Promise<{ data: { id: string }; message: string }> => {
    const res = await apiClient.post<{ data: { id: string }; message: string }>("/account/manual-recovery-request", data);
    return res.data;
  },
};
