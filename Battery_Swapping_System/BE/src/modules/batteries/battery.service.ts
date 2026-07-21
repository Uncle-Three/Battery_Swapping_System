import { batteryRepository } from "./battery.repository";

export const batteryService = {
  list: () => batteryRepository.findMany(),
  listFaulty: () => batteryRepository.findFaulty(),
  getById: (id: string) => batteryRepository.findById(id),
};

