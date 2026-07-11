export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    REFRESH: '/auth/refresh',
    LOGOUT: '/auth/logout',
  },
  USERS: {
    ME: '/users/me',
  },
  ADMIN: {
    USERS: '/admin/users',
    USER_ROLE: (id: string) => `/admin/users/${id}/role`,
    USER_STATUS: (id: string) => `/admin/users/${id}/status`,
    ROLES: '/admin/roles',
    PERMISSIONS: '/admin/permissions',
  },
  STATIONS: {
    LIST: '/stations',
    DETAILS: (id: string) => `/stations/${id}`,
    SLOTS: (id: string) => `/stations/${id}/slots`,
  },
  SWAP: {
    INITIATE: '/swaps/initiate',
    PROCESS: '/swaps/process',
    HISTORY: '/swaps/history',
  },
  REPORTS: {
    ANALYTICS: '/reports/analytics',
    INVENTORY: '/reports/inventory',
  },
};
