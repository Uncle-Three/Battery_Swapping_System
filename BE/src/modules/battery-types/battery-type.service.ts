import { batteryTypeRepository } from "./battery-type.repository";
import { NotFoundError } from "../../common/errors/not-found-error";

export const batteryTypeService = {
  list: () => batteryTypeRepository.findMany(),
  getById: async (id: string) => {
    const data = await batteryTypeRepository.findById(id);
    if (!data) throw new NotFoundError("Battery type not found");
    return data;
  },
  create: (data: any) => batteryTypeRepository.create(data),
  update: (id: string, data: any) => batteryTypeRepository.update(id, data),
  delete: async (id: string) => {
    await batteryTypeRepository.delete(id);
    return { success: true };
  },
};
