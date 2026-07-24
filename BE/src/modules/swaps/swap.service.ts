import { swapRepository } from "./swap.repository";
import { swapMapper } from "./swap.mapper";

export const swapService = {
  history: async (userId: string) =>
    (await swapRepository.findHistoryByUserId(userId)).map(swapMapper.toHistoryResponse),
};
