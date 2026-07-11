import { stationRepository } from "./station.repository";

export const stationService = {
  list: () => stationRepository.findMany(),
  getById: (id: string) => stationRepository.findById(id),
  getSlots: (id: string) => stationRepository.findSlots(id),
};

