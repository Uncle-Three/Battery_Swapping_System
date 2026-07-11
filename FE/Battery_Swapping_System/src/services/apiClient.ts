import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { API_ENDPOINTS } from '../constants/endpoints';
import { useAuthStore } from '../store/authStore';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

type ApiResponse<T> = {
  success: boolean;
  data: T;
  message?: string;
};

type RetriableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

let refreshPromise: Promise<string> | null = null;

const publicAuthPaths = [API_ENDPOINTS.AUTH.LOGIN, API_ENDPOINTS.AUTH.REGISTER, API_ENDPOINTS.AUTH.REFRESH];

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
        clearAuthAndRedirect();
        return Promise.reject(refreshError);
      }
    }

    if (error.response?.status === 401 && !isPublicAuthRequest) {
      clearAuthAndRedirect();
    }

    return Promise.reject(error);
  }
);

export const unwrapData = <T>(response: { data: ApiResponse<T> }): T => response.data.data;

export default apiClient;
