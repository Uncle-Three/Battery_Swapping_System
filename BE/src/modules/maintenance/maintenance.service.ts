import { maintenanceRepository } from "./maintenance.repository";

export const maintenanceService = {
  create: (input: unknown) => maintenanceRepository.create(input),
  list: () => maintenanceRepository.findMany(),
};

