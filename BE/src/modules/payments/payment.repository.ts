export const paymentRepository = {
  findWalletByUserId: async (userId: string) => ({ userId, balance: 0 }),
  createTopup: async (userId: string, input: unknown) => ({ userId, input }),
  purchaseSubscription: async (userId: string, input: unknown) => ({ userId, input }),
};

