import { safetyRuleRepository } from "./safety-rule.repository";
import { NotFoundError } from "../../common/errors/not-found-error";

export const safetyRuleService = {
  list: () => safetyRuleRepository.findMany(),
  getById: async (id: string) => {
    const data = await safetyRuleRepository.findById(id);
    if (!data) throw new NotFoundError("Safety rule not found");
    return data;
  },
  create: (data: any) => safetyRuleRepository.create(data),
  update: (id: string, data: any) => safetyRuleRepository.update(id, data),
  delete: async (id: string) => {
    await safetyRuleRepository.delete(id);
    return { success: true };
  },
};
