import { batterySlotRepository } from "./battery-slot.repository";

export const batterySlotService = {
  list: () => batterySlotRepository.findMany(),
  getById: (id: string) => batterySlotRepository.findById(id),
};

