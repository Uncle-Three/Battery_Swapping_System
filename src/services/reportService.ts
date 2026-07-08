

export const reportService = {
  getAnalytics: async (): Promise<any> => {
    // const response = await apiClient.get(API_ENDPOINTS.REPORTS.ANALYTICS);
    // return response.data;

    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          totalSwaps: 1240,
          activeUsers: 342,
          revenue: 55800000,
          stationEfficiency: 94.2,
          monthlySwaps: [
            { month: 'Jan', swaps: 150 },
            { month: 'Feb', swaps: 220 },
            { month: 'Mar', swaps: 280 },
            { month: 'Apr', swaps: 310 },
            { month: 'May', swaps: 380 },
            { month: 'Jun', swaps: 420 },
          ],
        });
      }, 500);
    });
  },

  getInventory: async (): Promise<any> => {
    // const response = await apiClient.get(API_ENDPOINTS.REPORTS.INVENTORY);
    // return response.data;

    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          totalBatteries: 120,
          readyBatteries: 82,
          chargingBatteries: 28,
          maintenanceBatteries: 7,
          faultyBatteries: 3,
        });
      }, 500);
    });
  },
};
