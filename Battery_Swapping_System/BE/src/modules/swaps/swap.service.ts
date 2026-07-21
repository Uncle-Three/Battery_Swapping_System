import { swapRepository } from "./swap.repository";

export const swapService = {
  history: (userId: string) => swapRepository.findHistoryByUserId(userId),
};
