export const reportRepository = {
  getAnalytics: async (period = "month") => ({ period }),
  getInventory: async () => ({
    totalBatteries: 0,
    readyBatteries: 0,
    chargingBatteries: 0,
    maintenanceBatteries: 0,
    faultyBatteries: 0,
  }),
};

