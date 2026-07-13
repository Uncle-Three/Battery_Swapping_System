import { userRepository } from "./user.repository";
import { userMapper } from "./user.mapper";
import { NotFoundError } from "../../common/errors/not-found-error";
import { ConflictError } from "../../common/errors/conflict-error";
import type { z } from "zod";
import type { updateMeSchema } from "./user.validation";

type UpdateMeInput = z.infer<typeof updateMeSchema>;
type UserRepository = typeof userRepository;

type UserServiceDependencies = {
  repository: Pick<UserRepository, "findById" | "findByPhone" | "updateProfile" | "findMany" | "findVehicles" | "findVehicleDetail" | "findMemberDashboard" | "isUniqueConstraintError">;
};

export const createUserService = (dependencies: UserServiceDependencies) => ({
  getProfile: async (id: string) => {
    const user = await dependencies.repository.findById(id);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    return userMapper.toResponse(user);
  },

  updateMe: async (id: string, input: UpdateMeInput) => {
    const existingUser = await dependencies.repository.findById(id);
    if (!existingUser) {
      throw new NotFoundError("User not found");
    }

    const phone = input.phone === undefined ? undefined : input.phone?.trim() || null;
    if (phone && phone !== existingUser.phone) {
      const existingPhone = await dependencies.repository.findByPhone(phone);
      if (existingPhone && existingPhone.id !== id) {
        throw new ConflictError("Phone already exists");
      }
    }

    const fullName = input.name?.trim() ?? input.fullName?.trim();

    try {
      const user = await dependencies.repository.updateProfile(id, {
        ...(fullName ? { fullName } : {}),
        ...(input.phone !== undefined ? { phone } : {}),
        ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl } : {}),
      });

      return userMapper.toResponse(user);
    } catch (error) {
      if (dependencies.repository.isUniqueConstraintError(error)) {
        throw new ConflictError("Phone already exists");
      }

      throw error;
    }
  },

  list: async () => {
    const users = await dependencies.repository.findMany();
    return users.map(userMapper.toResponse);
  },

  getVehicles: (userId: string) => dependencies.repository.findVehicles(userId),
  getVehicleDetail: async (userId: string, id: string) => {
    const vehicle = await dependencies.repository.findVehicleDetail(userId, id);
    if (!vehicle) throw new NotFoundError("Vehicle not found");
    return vehicle;
  },
  getDashboard: async (userId: string) => {
    const dashboard = await dependencies.repository.findMemberDashboard(userId);
    if (!dashboard) throw new NotFoundError("User not found");
    return dashboard;
  },
});

export const userService = createUserService({
  repository: userRepository,
});
