export type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

export type PaginatedResponse<T> = ApiResponse<{
  items: T[];
  page: number;
  limit: number;
  total: number;
}>;

