export const TransactionStatus = {
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
} as const;

export type TransactionStatus = (typeof TransactionStatus)[keyof typeof TransactionStatus];

