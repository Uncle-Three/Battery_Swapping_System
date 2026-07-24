export type ForgotPasswordInput = {
  email: string;
};

export type VerifyResetOtpInput = {
  email: string;
  otp: string;
};

export type ResetPasswordInput = {
  email: string;
  otp: string;
  newPassword: string;
};

export type RequestPhoneChangeInput = {
  newPhone: string;
};

export type VerifyPhoneChangeInput = {
  otp: string;
};

export type ManualRecoveryInput = {
  contactEmail: string;
  contactPhone?: string;
  description: string;
  documentUrls?: string[];
};

export type AdminReviewRecoveryInput = {
  adminNotes?: string;
  rejectionReason?: string;
  resolvedAction?: string;
};
