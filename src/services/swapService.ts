import type { SwapTransaction } from '../types';

export const swapService = {
  initiateSwap: async (_bookingId: string): Promise<any> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          message: 'Swap initiated successfully. Please approach the station.',
          transactionId: 'tx-1234',
        });
      }, 500);
    });
  },

  processSwap: async (_data: { rfidCard?: string; licensePlate?: string }): Promise<SwapTransaction> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          id: 'tx-1234',
          userId: 'u-1',
          userName: 'Tuấn Anh',
          stationId: 'st-1',
          stationName: 'Trạm Sạc GreenCharge Quận 1',
          batteryInId: 'b-old-99',
          batteryInSoc: 12,
          batteryOutId: 'b-1',
          batteryOutSoc: 98,
          cost: 45000,
          status: 'SUCCESS',
          createdAt: new Date().toISOString(),
        });
      }, 800);
    });
  },

  getSwapHistory: async (): Promise<SwapTransaction[]> => {
    return [
      {
        id: 'tx-1234',
        userId: 'u-1',
        userName: 'Tuấn Anh',
        stationId: 'st-1',
        stationName: 'Trạm Sạc GreenCharge Quận 1',
        batteryInId: 'b-old-99',
        batteryInSoc: 12,
        batteryOutId: 'b-1',
        batteryOutSoc: 98,
        cost: 45000,
        status: 'SUCCESS',
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      },
      {
        id: 'tx-1233',
        userId: 'u-1',
        userName: 'Tuấn Anh',
        stationId: 'st-2',
        stationName: 'Trạm Sạc GreenCharge Quận 7',
        batteryInId: 'b-old-88',
        batteryInSoc: 5,
        batteryOutId: 'b-3',
        batteryOutSoc: 100,
        cost: 50000,
        status: 'SUCCESS',
        createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
      },
    ];
  },
};
