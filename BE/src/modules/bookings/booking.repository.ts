export const bookingRepository = {
  findActiveByUserId: async (userId: string) => ({ userId }),
  create: async (userId: string, input: unknown) => ({ userId, input }),
  findById: async (id: string) => ({ id }),
  cancel: async (id: string) => ({ id, status: "CANCELLED" }),
};

