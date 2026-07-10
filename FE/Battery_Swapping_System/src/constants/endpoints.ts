export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    PROFILE: '/auth/profile',
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
