import { compatibilityRepository } from "./compatibility.repository";
import { NotFoundError } from "../../common/errors/not-found-error";

export const compatibilityService = {
  list: () => compatibilityRepository.findMany(),
  getById: async (id: string) => {
    const data = await compatibilityRepository.findById(id);
    if (!data) throw new NotFoundError("Compatibility not found");
    return data;
  },
  create: (data: any) => compatibilityRepository.create(data),
  update: (id: string, data: any) => compatibilityRepository.update(id, data),
  delete: async (id: string) => {
    await compatibilityRepository.delete(id);
    return { success: true };
  },
};
