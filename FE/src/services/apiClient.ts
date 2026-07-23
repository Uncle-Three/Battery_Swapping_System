import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { API_ENDPOINTS } from '../constants/endpoints';
import { useAuthStore } from '../store/authStore';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15_000,
});

type ApiErrorPayload = { code?: string; message?: string; errors?: unknown; requestId?: string };

const apiMessageTranslations: Array<[RegExp, string]> = [
  [/^Booking not found at this station\.?$/i, 'Không tìm thấy lịch thay pin tại trạm này.'],
  [/^Booking not found\.?$/i, 'Không tìm thấy lịch thay pin.'],
  [/^Station not found\.?$/i, 'Không tìm thấy trạm.'],
  [/^User not found\.?$/i, 'Không tìm thấy người dùng.'],
  [/^Staff is not assigned to this station\.?$/i, 'Nhân viên chưa được phân công vào trạm này.'],
  [/^Booking is not assigned to (the )?selected bay\.?$/i, 'Lịch thay pin không thuộc khoang đã chọn.'],
  [/^Selected service bay no longer has (an )?active reservation\.?$/i, 'Khoang đã chọn không còn được giữ cho lịch này.'],
  [/^Selected service bay is not available.*$/i, 'Khoang đã chọn hiện không khả dụng.'],
  [/^Check-in is only allowed.*$/i, 'Chỉ có thể tiếp nhận khách trong vòng 30 phút trước lịch hẹn.'],
  [/^A swap workflow already exists.*$/i, 'Lịch này đã có quy trình thay pin đang được xử lý.'],
  [/^Booking is missing (a )?vehicle.*$/i, 'Lịch thay pin chưa có thông tin xe.'],
  [/^Booking is missing (a )?scheduled time.*$/i, 'Lịch thay pin chưa có thời gian hẹn.'],
  [/^Scanned battery.*not.*reserved.*$/i, 'Pin vừa quét không phải pin được giữ cho lịch này.'],
  [/^Email already exists\.?$/i, 'Email này đã được đăng ký.'],
  [/^Phone already exists\.?$/i, 'Số điện thoại này đã được đăng ký.'],
  [/^(User already exists|A unique value already exists)\.?$/i, 'Email hoặc số điện thoại đã được đăng ký.'],
  [/^Email verification link is invalid or expired\.?$/i, 'Liên kết xác minh không hợp lệ hoặc đã hết hạn.'],
  [/^Unauthorized\.?$/i, 'Bạn chưa đăng nhập hoặc phiên đăng nhập đã hết hạn.'],
  [/^Forbidden\.?$/i, 'Bạn không có quyền thực hiện thao tác này.'],
  [/^Internal server error\.?$/i, 'Máy chủ gặp lỗi. Vui lòng thử lại sau.'],
];

const translateApiMessage = (message?: string) => {
  if (!message) return 'Yêu cầu không thành công.';
  return apiMessageTranslations.find(([pattern]) => pattern.test(message))?.[1] ?? message;
};

export class ApiClientError extends Error {
  readonly status?: number;
  readonly code?: string;
  readonly requestId?: string;
  readonly details?: unknown;
  constructor(message: string, status?: number, code?: string, requestId?: string, details?: unknown) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
    this.requestId = requestId;
    this.details = details;
  }
}

export const getApiErrorMessage = (error: unknown, fallback = 'Không thể kết nối tới hệ thống.') => error instanceof Error ? error.message : fallback;

type ApiResponse<T> = {
  success: boolean;
  data: T;
  message?: string;
};

type RetriableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

let refreshPromise: Promise<string> | null = null;

<<<<<<< HEAD
const publicAuthPaths = [API_ENDPOINTS.AUTH.LOGIN, API_ENDPOINTS.AUTH.GOOGLE, API_ENDPOINTS.AUTH.REGISTER, API_ENDPOINTS.AUTH.VERIFY_EMAIL, API_ENDPOINTS.AUTH.RESEND_VERIFICATION, API_ENDPOINTS.AUTH.REFRESH];
=======
const publicAuthPaths = [API_ENDPOINTS.AUTH.LOGIN, API_ENDPOINTS.AUTH.GOOGLE, API_ENDPOINTS.AUTH.REGISTER, API_ENDPOINTS.AUTH.REFRESH];
>>>>>>> c1e66c0b73c4c02a2d09fc6d7459f123759cc74f

const clearAuthAndRedirect = () => {
  useAuthStore.getState().logout();
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
};

const refreshAccessToken = async (): Promise<string> => {
  if (!refreshPromise) {
    refreshPromise = apiClient
      .post<ApiResponse<{ accessToken: string }>>(API_ENDPOINTS.AUTH.REFRESH, undefined, {
        headers: { Authorization: undefined },
      })
      .then((response) => {
        const accessToken = response.data.data.accessToken;
        useAuthStore.getState().setToken(accessToken);
        return accessToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
};

apiClient.interceptors.request.use(
  (config) => {
    const requestUrl = config.url ?? '';
    const token = useAuthStore.getState().token;
    const isPublicAuthRequest = publicAuthPaths.some((path) => requestUrl.endsWith(path));
    if (token && config.headers && !isPublicAuthRequest) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetriableRequestConfig | undefined;
    const requestUrl = originalRequest?.url ?? '';
    const isPublicAuthRequest = publicAuthPaths.some((path) => requestUrl.endsWith(path));

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isPublicAuthRequest) {
      originalRequest._retry = true;

      try {
        const accessToken = await refreshAccessToken();
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        if (refreshError instanceof ApiClientError && [401, 403].includes(refreshError.status ?? 0)) {
          clearAuthAndRedirect();
        }
        return Promise.reject(refreshError);
      }
    }

    if (error.response?.status === 401 && !isPublicAuthRequest) {
      clearAuthAndRedirect();
    }

    const payload = error.response?.data as ApiErrorPayload | undefined;
    if (error.code === 'ECONNABORTED') return Promise.reject(new ApiClientError('Yêu cầu đã hết thời gian chờ. Vui lòng thử lại.', error.response?.status));
    if (!error.response) return Promise.reject(new ApiClientError('Không thể kết nối tới máy chủ. Hãy kiểm tra backend đang chạy.'));
    return Promise.reject(new ApiClientError(translateApiMessage(payload?.message), error.response.status, payload?.code, payload?.requestId, payload?.errors));
  }
);

export const unwrapData = <T>(response: { data: ApiResponse<T> }): T => response.data.data;

export default apiClient;
