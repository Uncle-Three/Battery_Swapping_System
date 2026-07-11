import { bookingRepository } from "./booking.repository";

export const bookingService = {
  getActive: (userId: string) => bookingRepository.findActiveByUserId(userId),
  create: (userId: string, input: unknown) => bookingRepository.create(userId, input),
  getById: (id: string) => bookingRepository.findById(id),
  cancel: (id: string) => bookingRepository.cancel(id),
};

