import type { SwapHistoryItem, SwapPaymentStatus, SwapStatus } from './swapHistoryTypes';

export const formatCurrencyVND = (amount: number): string =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);

export const formatPercent = (value: number | null | undefined): string =>
  typeof value === 'number' && Number.isFinite(value)
    ? `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(value)}%`
    : 'Chưa ghi nhận';

export const formatSwapDate = (value: string): { time: string; date: string } => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { time: 'Không có dữ liệu', date: '' };
  return {
    time: new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(date),
    date: new Intl.DateTimeFormat('vi-VN').format(date),
  };
};

export const formatSwapDateTime = (value?: string | null): string => {
  if (!value) return 'Chưa ghi nhận';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Chưa ghi nhận'
    : new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'medium' }).format(date);
};

export const SWAP_STATUS_LABELS: Record<SwapStatus, string> = {
  PENDING: 'Chờ xử lý',
  IN_PROGRESS: 'Đang đổi pin',
  COMPLETED: 'Hoàn tất',
  CANCELLED: 'Đã hủy',
  FAILED: 'Thất bại',
};

export const PAYMENT_STATUS_LABELS: Record<SwapPaymentStatus, string> = {
  NOT_REQUIRED: 'Không phát sinh',
  PENDING: 'Chờ thanh toán',
  PAID: 'Đã thanh toán',
  FAILED: 'Thanh toán thất bại',
  REFUNDED: 'Đã hoàn tiền',
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  VNPAY: 'VNPay',
  MOMO: 'MoMo',
  CARD: 'Thẻ',
  WALLET: 'Ví điện tử',
  CASH: 'Tiền mặt',
};

export const getCostDisplay = (swap: SwapHistoryItem): { primary: string; secondary?: string } => {
  if (swap.paymentStatus === 'REFUNDED') {
    return { primary: formatCurrencyVND(swap.finalAmount), secondary: 'Đã hoàn tiền' };
  }
  if (swap.status === 'FAILED' || swap.status === 'CANCELLED' || swap.paymentStatus === 'NOT_REQUIRED') {
    return { primary: 'Không phát sinh' };
  }
  if (swap.paymentStatus === 'PENDING' || swap.paymentStatus === 'FAILED') {
    return { primary: 'Chưa thanh toán' };
  }
  if (swap.finalAmount === 0) {
    return { primary: formatCurrencyVND(0), secondary: 'Đã bao gồm trong gói' };
  }
  return { primary: formatCurrencyVND(swap.finalAmount) };
};

export const canViewInvoice = (swap: SwapHistoryItem): boolean =>
  swap.status === 'COMPLETED' && swap.paymentStatus === 'PAID' && Boolean(swap.invoiceId);
