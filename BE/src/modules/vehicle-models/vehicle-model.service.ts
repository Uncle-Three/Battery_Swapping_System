import { vehicleModelRepository } from "./vehicle-model.repository";
import { NotFoundError } from "../../common/errors/not-found-error";

export const vehicleModelService = {
  list: () => vehicleModelRepository.findMany(),
  getById: async (id: string) => {
    const data = await vehicleModelRepository.findById(id);
    if (!data) throw new NotFoundError("Vehicle model not found");
    return data;
  },
  create: (data: any) => vehicleModelRepository.create(data),
  update: (id: string, data: any) => vehicleModelRepository.update(id, data),
  delete: async (id: string) => {
    await vehicleModelRepository.delete(id);
    return { success: true };
  },
};
