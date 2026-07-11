import { paymentRepository } from "./payment.repository";

export const paymentService = {
  getWallet: (userId: string) => paymentRepository.findWalletByUserId(userId),
  createTopup: (userId: string, input: unknown) => paymentRepository.createTopup(userId, input),
  purchaseSubscription: (userId: string, input: unknown) =>
    paymentRepository.purchaseSubscription(userId, input),
};

