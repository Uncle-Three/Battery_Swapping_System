import { swapRepository } from "./swap.repository";

export const swapService = {
  initiate: (bookingId: string) => swapRepository.initiate(bookingId),
  process: (input: unknown) => swapRepository.process(input),
  history: (userId: string) => swapRepository.findHistoryByUserId(userId),
};

