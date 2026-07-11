export const swapRepository = {
  initiate: async (bookingId: string) => ({ success: true, bookingId }),
  process: async (input: unknown) => ({ input }),
  findHistoryByUserId: async (_userId: string) => [],
};

