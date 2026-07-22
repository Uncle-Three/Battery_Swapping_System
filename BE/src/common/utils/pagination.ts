export type PaginationInput = {
  page?: number;
  limit?: number;
};

export const getPagination = ({ page = 1, limit = 10 }: PaginationInput) => {
  const safePage = Math.max(page, 1);
  const safeLimit = Math.min(Math.max(limit, 1), 100);

  return {
    page: safePage,
    limit: safeLimit,
    skip: (safePage - 1) * safeLimit,
    take: safeLimit,
  };
};

